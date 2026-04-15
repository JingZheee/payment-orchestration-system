# Routing Strategy & Provider Config Documentation

## Table of Contents

1. [Payment Initiation Flow (End-to-End)](#1-payment-initiation-flow-end-to-end)
2. [Step 1 — Eligibility Filter](#2-step-1--eligibility-filter)
3. [Step 2 — Rule-Based Routing](#3-step-2--rule-based-routing)
4. [Step 3 — Composite Score Fallback](#4-step-3--composite-score-fallback)
5. [Routing Strategies](#5-routing-strategies)
6. [ProviderScorer — Score Formula](#6-providerscorer--score-formula)
7. [Provider Fee Rates](#7-provider-fee-rates)
8. [Provider Config](#8-provider-config)
9. [RoutingRule Fields Reference](#9-routingrule-fields-reference)
10. [How Routing Reason Is Recorded](#10-how-routing-reason-is-recorded)
11. [Payment Method Selection — Why It Is Required at Initiation](#11-payment-method-selection--why-it-is-required-at-initiation)

---

## 1. Payment Initiation Flow (End-to-End)

```
POST /api/v1/payments/initiate
  │  Header: Idempotency-Key: <uuid>
  │  Body:   { amount, currency, region, paymentMethod, ... }
  │
  ▼
IdempotencyFilter                          ← servlet filter, runs before controller
  └─ checks idempotency_records table
  └─ if duplicate key → returns cached response immediately (no routing)
  └─ if new key → continues
  │
  ▼
PaymentController.initiate()
  │
  ▼
PaymentService.initiatePayment()
  │
  ├─ 1. Build RoutingContext (amount, currency, region, paymentMethod, allProviders)
  │
  ├─ 2. RoutingEngine.route(context)        ← provider selection (see §2-4 below)
  │       └─ returns RoutingDecision { provider, strategy, reason, score }
  │
  ├─ 3. Persist Transaction as PENDING
  │       └─ stores provider, routingStrategy, routingReason on the record
  │       └─ writes INITIATED event to transaction_events
  │
  ├─ 4. Call provider.initiatePayment(request)
  │       └─ on ProviderException → mark FAILED, write PROVIDER_ERROR event, return
  │
  ├─ 5. Update Transaction with provider result (status, providerTransactionId, fee, redirectUrl)
  │       └─ writes PROVIDER_RESPONSE event
  │
  └─ 6. If status is PENDING or PROCESSING → schedule retry via RabbitMQ (attempt 1, 30s delay)
          └─ writes RETRY_SCHEDULED event
```

**Key files:**
- `PaymentController` — `pos-payment/.../controller/PaymentController.java`
- `PaymentService` — `pos-payment/.../service/PaymentService.java`
- `RoutingEngine` — `pos-routing/.../engine/RoutingEngine.java`

---

## 2. Step 1 — Eligibility Filter

Before any routing logic runs, `RoutingEngine` narrows the full provider list down to an **eligible set**:

```java
// RoutingEngine.eligibleProviders()
allProviders.stream()
    .filter(p -> ProviderRegionSupport.supportsRegion(p.getProvider(), context.getRegion()))
    .filter(PaymentProviderPort::isAvailable)
```

Two conditions must both pass:

| Check | Source | Detail |
|-------|--------|--------|
| Region support | `ProviderRegionSupport` (static map) | Hard-coded per provider — see table below |
| Availability | `provider_configs.is_enabled` | Toggled at runtime via `POST /api/v1/admin/providers/{provider}/toggle` |

**Region support map:**

| Provider | Supported Regions |
|----------|-------------------|
| BILLPLZ  | MY (Malaysia) |
| MIDTRANS | ID (Indonesia) |
| PAYMONGO | PH (Philippines) |
| MOCK     | MY, ID, PH (all — for testing) |

If the eligible set is empty after filtering, a `RoutingException` is thrown and the payment fails immediately.

---

## 3. Step 2 — Rule-Based Routing

If at least one eligible provider exists, the engine checks the `routing_rules` table for a matching rule.

Rules are evaluated **in ascending priority order** (lowest number = highest priority). The **first rule that matches the transaction wins** — no further rules are checked.

### Rule matching conditions

A rule matches a transaction if **all** non-null fields pass:

| Rule Field | Match Condition |
|------------|-----------------|
| `region` | equals `context.region` (or null = match any) |
| `currency` | equals `context.currency` (or null = match any) |
| `minAmount` | `context.amount >= minAmount` (or null = no lower bound) |
| `maxAmount` | `context.amount <= maxAmount` (or null = no upper bound) |
| `is_enabled` | must be `true` |

### What happens when a rule matches

A matching rule takes one of two actions — only one field should be set per rule:

**Option A — `preferredProvider` is set:**
The engine returns that provider directly, as long as it is in the eligible set. If the preferred provider is currently unavailable/disabled, this rule is skipped and the next rule is tried.

```
RoutingDecision {
  provider  = rule.preferredProvider,
  strategy  = REGION_BASED,
  reason    = "Rule #3 (priority=1): preferred=BILLPLZ"
}
```

**Option B — `strategy` is set:**
The engine delegates to the named strategy bean (`REGION_BASED`, `SUCCESS_RATE`, or `LOWEST_FEE`) to pick the best provider from the eligible set. If the strategy returns empty (no eligible provider), this rule is skipped and the next rule is tried.

```
RoutingDecision {
  provider  = (strategy result),
  strategy  = SUCCESS_RATE,
  reason    = "Success-rate: MIDTRANS has highest rate 0.97 in region ID"
}
```

If **no rule matches** at all, routing falls through to Step 3.

---

## 4. Step 3 — Composite Score Fallback

When no routing rule matches, the engine scores **every eligible provider** using `ProviderScorer` and picks the highest score.

```
RoutingDecision {
  provider  = (highest-scoring provider),
  strategy  = COMPOSITE_SCORE,
  reason    = "Composite score: BILLPLZ scored 0.812500 in region MY",
  score     = 0.812500
}
```

See [§6 ProviderScorer](#6-providerscorer--score-formula) for the full formula.

---

## 5. Routing Strategies

Three strategy implementations exist. Each is a Spring `@Component` and is selected either by a routing rule's `strategy` field, or called directly for the composite fallback.

### REGION_BASED

**Class:** `RegionBasedStrategy`

Picks the **first available provider** that supports the requested region. No quality or cost data is consulted.

- Use when: you want deterministic, fast routing and don't care about optimizing cost or reliability.
- Example rule: "Always route MY transactions to BILLPLZ unless it's down."

```
eligible providers for MY: [BILLPLZ, MOCK]
→ returns BILLPLZ (first in list)
```

### SUCCESS_RATE

**Class:** `SuccessRateStrategy`

Picks the provider with the **highest historical success rate** for the requested region, from the most recent `provider_metrics` window.

- Data source: `provider_metrics.success_rate` — updated every 15 minutes by `MetricsAggregator`.
- Fallback: providers with no recorded metrics default to `0.0` success rate, so any provider with real data is preferred.
- Use when: reliability is the top priority (e.g., high-stakes transactions).

```
BILLPLZ success_rate=0.95, MOCK success_rate=0.80  (region=MY)
→ returns BILLPLZ
```

### LOWEST_FEE

**Class:** `LowestFeeStrategy`

Picks the provider that charges the **lowest fee** for the exact transaction amount, region, and payment method, computed live via `PaymentProviderPort.calculateFee()`.

- Fee is computed in real-time (not from cached metrics), so it always reflects the current fee structure.
- Region is passed explicitly so MOCK can return the correct region-specific fee rate (e.g. MOCK in MY uses MYR rates, MOCK in ID uses IDR rates).
- Use when: cost minimization is the priority (e.g., high-volume low-margin merchants).

```java
// LowestFeeStrategy.java
p.calculateFee(context.getAmount(), context.getRegion(), context.getPaymentMethod())
```

```
BILLPLZ fee=1.50, MOCK fee=0.80  (amount=100 MYR, region=MY, method=FPX)
→ returns MOCK
```

### COMPOSITE_SCORE (fallback only)

Not a standalone strategy class — this is the label applied when `ProviderScorer` runs as the Step 3 fallback. It combines all four signals (success rate, fee, latency, fee accuracy) into a single weighted score. See [§6](#6-providerscorer--score-formula).

---

## 6. ProviderScorer — Score Formula

**Class:** `ProviderScorer` — `pos-routing/.../scorer/ProviderScorer.java`

Produces a score in `[0, 1]` for each eligible provider. Higher is better.

```
score(provider) =
  (successRate        × successRateWeight)      // 0.40 default
  + ((1 - normFee)    × feeWeight)              // 0.25 default  ← lower fee = higher score
  + ((1 - normLatency)× latencyWeight)          // 0.15 default  ← lower latency = higher score
  + (feeAccuracy      × feeAccuracyWeight)      // 0.20 default
```

### Inputs

| Input | Source | Default (no data) |
|-------|--------|-------------------|
| `successRate` | Latest `provider_metrics.success_rate` for provider+region | `0.5` (neutral) |
| `normFee` | Volume-weighted avg fee ÷ max fee across eligible providers | — |
| `normLatency` | Provider avg latency ÷ max latency across eligible providers | — |
| `feeAccuracy` | Latest `provider_metrics.fee_accuracy_rate` for provider+region | `1.0` (assume honest) |
| Avg latency | Latest `provider_metrics.avg_latency_ms` | `500 ms` (conservative) |

### Volume-weighted fee (region-scoped)

Instead of using a flat fee percentage, the scorer uses the **real payment method distribution** observed in `recon_statements`, filtered to the transaction's region, to compute a weighted average fee:

```
weightedFee = Σ (fee_for_method × share_of_method_in_region_history)
```

The recon query used:
```java
reconRepository.countByPaymentMethodForProviderAndRegion(provider, context.getRegion())
```

Fee rate lookup inside the loop:
```java
feeRateRepository.findByProviderAndRegionAndPaymentMethodAndActiveTrue(provider, region, method)
```

**Why region-scoped?** MOCK covers all three regions. Without region filtering, MOCK's MY recon history (FPX transactions) would contaminate its ID or PH fee estimates — making the volume-weighted fee meaningless for cross-region comparisons.

**Fallback behaviour when no recon data exists for the region:**
- Uses the fee rate for the context's payment method from `provider_fee_rates` directly.
- Historical MOCK recon rows that predate the region column have `NULL` region and are excluded from region-scoped queries — they naturally fall through to the fallback path.

### Weights (configurable)

Weights are set in `application.yml` under `routing.scorer.*` and bound via `ScorerProperties`:

```yaml
routing:
  scorer:
    success-rate-weight: 0.40
    fee-weight: 0.25
    latency-weight: 0.15
    fee-accuracy-weight: 0.20
```

All four weights must sum to `1.0`.

### Score breakdown (admin dashboard)

`ProviderScorer.scoreDetail()` returns a `ScoreDetail` record with all raw inputs and weighted components, which is exposed on the admin dashboard so examiners can see exactly why a provider was chosen.

---

## 7. Provider Fee Rates

**Entity:** `ProviderFeeRate` — `provider_fee_rates` table (V10 + V15 migrations)
**API:** `GET /api/v1/admin/fee-rates`, `PUT /api/v1/admin/fee-rates/{id}`

### Table structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial (PK) | Auto-generated identity |
| `provider` | VARCHAR(20) | `BILLPLZ`, `MIDTRANS`, `PAYMONGO`, `MOCK` |
| `region` | VARCHAR(10) | `MY`, `ID`, `PH` — added in V15 |
| `payment_method` | VARCHAR(30) | `FPX`, `CARD`, `VIRTUAL_ACCOUNT`, `QRIS`, `MAYA`, `GCASH`, etc. |
| `fee_type` | VARCHAR(30) | `FIXED`, `PERCENTAGE`, or `FIXED_PLUS_PERCENTAGE` |
| `fixed_amount` | NUMERIC(19,4) | Flat fee amount in the provider's currency (nullable) |
| `percentage` | NUMERIC(7,6) | Fee as a decimal fraction e.g. `0.015000` = 1.5% (nullable) |
| `currency` | VARCHAR(5) | Currency the fee is expressed in (`MYR`, `IDR`, `PHP`) |
| `is_active` | boolean | Inactive rows are ignored by all fee lookups |
| `updated_at` | TIMESTAMPTZ | Auto-set on every save |

**Unique constraint:** `(provider, region, payment_method)` — one active fee rate per provider per region per method.

### Why region is part of the key

Before V15, the unique key was `(provider, payment_method)` with no region. This was a problem because **MOCK covers three regions** (MY, ID, PH) but had a single fee row per method. The scorer couldn't give MOCK a different fee estimate in Malaysia vs Indonesia.

After V15, each row is region-scoped:
- Single-region providers (BILLPLZ, MIDTRANS, PAYMONGO) each have one region per row — the region is explicit but implied by the provider.
- MOCK has separate rows per region, allowing it to simulate different fee structures (MYR rates for MY, IDR rates for ID, PHP rates for PH).

The V15 migration derived the region from the existing `currency` column (MYR→MY, IDR→ID, PHP→PH) — no rows were duplicated or deleted.

### Seeded fee rates (V10, post-V15 region assignment)

| Provider | Region | Method | Type | Fee |
|----------|--------|--------|------|-----|
| BILLPLZ | MY | FPX | FIXED | MYR 1.25 |
| BILLPLZ | MY | CARD | PERCENTAGE | 1.5% |
| BILLPLZ | MY | EWALLET | PERCENTAGE | 1.5% |
| MIDTRANS | ID | VIRTUAL_ACCOUNT | FIXED | IDR 4,000 |
| MIDTRANS | ID | QRIS | PERCENTAGE | 0.7% |
| MIDTRANS | ID | GOPAY | PERCENTAGE | 2.0% |
| MIDTRANS | ID | EWALLET | PERCENTAGE | 2.0% |
| MIDTRANS | ID | CARD | FIXED + % | IDR 2,000 + 2.9% |
| PAYMONGO | PH | MAYA | PERCENTAGE | 1.79% |
| PAYMONGO | PH | GCASH | PERCENTAGE | 2.23% |
| PAYMONGO | PH | GRABPAY | PERCENTAGE | 1.96% |
| PAYMONGO | PH | CARD | FIXED + % | PHP 13.39 + 3.125% |
| PAYMONGO | PH | EWALLET | PERCENTAGE | 2.23% |
| MOCK | MY | FPX, CARD, EWALLET | PERCENTAGE | 1% |
| MOCK | ID | VIRTUAL_ACCOUNT, QRIS | PERCENTAGE | 1% |
| MOCK | PH | MAYA, GCASH | PERCENTAGE | 1% |

### calculateFee interface contract

All provider adapters implement:
```java
BigDecimal calculateFee(BigDecimal amount, Region region, PaymentMethod paymentMethod);
```

- **Single-region adapters** (BILLPLZ, MIDTRANS, PAYMONGO): accept the `region` parameter for interface consistency but hardcode their own region in the DB lookup. The parameter is never used.
- **MOCK adapter**: uses the `region` parameter directly, looking up `(MOCK, region, paymentMethod)` in `provider_fee_rates`.

This means fee comparison in `LowestFeeStrategy` and `ProviderScorer` is always region-correct — a MY transaction never accidentally compares against MOCK's IDR fee rates.

### Admin API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/fee-rates` | Lists all fee rates sorted by provider → region → payment method. Response includes the `region` field. |
| `PUT` | `/api/v1/admin/fee-rates/{id}` | Updates `fixedAmount` and/or `percentage` for a specific row by its ID. Region and method are immutable — only the amounts change. |

---

## 8. Provider Config

**Entity:** `ProviderConfig` — `provider_configs` table (V4 migration)
**API:** `GET/POST /api/v1/admin/providers`

Each provider has a single config row, keyed by the `Provider` enum. This table is intentionally **not** region-scoped — enabling/disabling a provider applies to all regions it serves.

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `Provider` (PK) | `BILLPLZ`, `MIDTRANS`, `PAYMONGO`, `MOCK` |
| `is_enabled` | boolean | Determines `isAvailable()` — disabled providers are excluded from routing at the eligibility filter stage |
| `fee_percentage` | decimal(5,4) | Legacy field, not used by fee calculations (see §7 for current fee rates) |
| `webhook_secret` | string | HMAC-SHA256 or RSA key used by `WebhookController` to verify inbound webhook signatures |
| `updated_at` | Instant | Auto-set on every save |

### Toggling a provider

```
POST /api/v1/admin/providers/{provider}/toggle?enabled=false
```

Sets `is_enabled = false`. On the next payment request, `eligibleProviders()` calls `isAvailable()` on every provider — which checks this flag — and excludes the disabled provider. The change takes effect immediately without a restart.

### isAvailable() implementation

Each adapter's `isAvailable()` reads `provider_configs.is_enabled` from the DB. The MOCK adapter always returns `true` unconditionally, so it stays available for testing even if accidentally disabled via the admin API.

---

## 9. RoutingRule Fields Reference

**Entity:** `RoutingRule` — `routing_rules` table (V5 + V13 migrations)
**API:** `GET/POST/PUT/DELETE /api/v1/admin/routing-rules`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | Long | auto | Primary key |
| `priority` | int | yes | Lower number = evaluated first. Rules are sorted ascending. |
| `region` | Region enum | no | `MY`, `ID`, `PH`. Null means match any region. |
| `currency` | Currency enum | no | `MYR`, `IDR`, `PHP`. Null means match any currency. |
| `minAmount` | BigDecimal | no | Transaction amount lower bound (inclusive). |
| `maxAmount` | BigDecimal | no | Transaction amount upper bound (inclusive). |
| `preferredProvider` | Provider enum | no* | Force a specific provider. Mutually exclusive with `strategy`. |
| `strategy` | RoutingStrategy enum | no* | Delegate to `REGION_BASED`, `SUCCESS_RATE`, or `LOWEST_FEE`. Mutually exclusive with `preferredProvider`. |
| `is_enabled` | boolean | yes | Disabled rules are skipped entirely. |
| `created_at` | Instant | auto | Set on insert. |

*At least one of `preferredProvider` or `strategy` should be set for the rule to do anything useful.

### Example rule configurations

**Force BILLPLZ for all Malaysian transactions:**
```json
{ "priority": 1, "region": "MY", "preferredProvider": "BILLPLZ", "enabled": true }
```

**Use lowest-fee strategy for large Indonesian payments:**
```json
{ "priority": 2, "region": "ID", "minAmount": 1000000, "strategy": "LOWEST_FEE", "enabled": true }
```

**Use success-rate strategy as a catch-all for Philippines:**
```json
{ "priority": 10, "region": "PH", "strategy": "SUCCESS_RATE", "enabled": true }
```

---

## 10. How Routing Reason Is Recorded

Every routing decision is written to two places for full traceability:

**`transactions` table:**
- `provider` — the selected provider enum
- `routing_strategy` — the strategy enum that made the decision
- `routing_reason` — human-readable string explaining the decision

**`transaction_events` table (append-only):**
- Event type `INITIATED` with description:
  `"Routed to BILLPLZ via REGION_BASED | Rule #1 (priority=1): preferred=BILLPLZ"`

This means every transaction carries a full audit trail of why it was routed to that provider, visible in `GET /api/v1/payments/{id}` and the admin transaction list.

---

## 11. Payment Method Selection — Why It Is Required at Initiation

### The two-step checkout flow

The system uses a **"method selection first, route second"** pattern. The frontend must call these two endpoints in order:

```
1. GET  /api/v1/payments/methods?region=MY&amount=100
        ← returns all available methods with their fees, per provider
        ← user sees: "FPX — RM 1.25", "CARD — RM 1.50"

2. POST /api/v1/payments/initiate
        Body: { region, amount, currency, paymentMethod, ... }
        ← routing engine runs with paymentMethod known
```

`paymentMethod` is a `@NotNull` required field in `InitiatePaymentRequest`.

### Why paymentMethod cannot be removed from initiation

| Reason | Detail |
|--------|--------|
| **Provider API call** | The adapter must tell the provider what kind of payment to create. Billplz needs to know FPX vs CARD. Midtrans needs VIRTUAL_ACCOUNT vs QRIS vs GOPAY. There is no generic "just charge them" API. |
| **LowestFeeStrategy** | Compares `calculateFee(amount, region, paymentMethod)` across eligible providers. FPX has a flat RM 1.25 fee; CARD has a 1.5% fee. Without the method, fee comparison is meaningless. |
| **Fee estimation on the transaction record** | `transaction.fee` is set at initiation time using `calculateFee`. This is the **estimated fee**. Reconciliation later compares it against the actual fee charged by the provider. Without `paymentMethod`, there is no estimated fee to reconcile against. |
| **Transaction audit trail** | `transaction.paymentMethod` is persisted and visible in the admin transaction list. |

### This is not double-selection

A common concern is that the user selects a payment method on the merchant's checkout page, and then the provider's payment gateway asks them to select a method again.

This does **not** happen because `paymentMethod` is passed to the provider when creating the payment intent. The provider's gateway then starts at the next step — not at method selection:

| Provider | What happens at the gateway |
|----------|-----------------------------|
| Billplz (FPX) | User selects their **bank** (Maybank, CIMB, etc.) — the method (FPX) is already set |
| Midtrans (VIRTUAL_ACCOUNT) | A VA number is generated immediately — user just pays to the account, no gateway redirect needed |
| PayMongo (MAYA / GCash) | User authenticates in their app — the method is pre-set in the payment intent |

The pattern is the same as Stripe: you pick "card" on the merchant's page, then enter your card number on Stripe's hosted page. You are not picking "card" twice — the gateway collects the card details, not the method choice.
