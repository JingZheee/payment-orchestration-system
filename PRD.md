# Product Requirements Document
# Payment Orchestration System (POS)
**Version:** 1.2
**Date:** 2026-05-16
**Type:** Final Year Project (FYP)

---

## 1. Executive Summary

The Payment Orchestration System (POS) is a backend-driven platform that intelligently routes insurance payment transactions across multiple payment providers in Southeast Asia — specifically Malaysia, Indonesia, and the Philippines. Rather than integrating directly with a single gateway, the system acts as an intelligent routing layer that sits *above* providers, deciding in real time which provider to use for each transaction based on region, provider success rate, transaction fees, and configurable business rules.

The primary use case is **insurance** — premium collection from policyholders and claims payouts to beneficiaries, where routing reliability directly affects policyholder trust and regulatory compliance. The core value proposition is **resilience and cost optimization**: when a provider is degraded or expensive, the system automatically reroutes to the best available alternative — without the insurance operator changing anything. This mirrors how large-scale platforms like Grab, Gojek, and Shopee manage payments internally, but packaged as a demonstrable, configurable system with a visual admin dashboard.

The MVP goal is a fully functional routing engine integrated with real sandbox providers (Billplz for Malaysia, Midtrans for Indonesia, PayMongo for the Philippines), with a Mock provider for controlled testing, and an Angular admin dashboard that makes the routing intelligence *visible* — showing live decisions, failover events, cost comparisons, and provider health in real time.

---

## 2. Mission

**Mission Statement:** Demonstrate that intelligent payment routing — not just payment processing — is the differentiating layer for insurance operators, by building a configurable orchestration engine that maximizes success rates and minimizes fees across Southeast Asian payment providers for both premium collection and claims disbursement.

### Core Principles

1. **The routing engine is the product** — provider integrations are adapters, not the point.
2. **Every routing decision must be explainable** — the system records *why* it chose a provider, not just which one.
3. **Failure is a first-class feature** — the system must handle and *visibly recover from* provider failures.
4. **Sandbox-first realism** — all providers are backed by real sandbox APIs; the Mock provider simulates failure scenarios.
5. **Built to be demonstrated** — every architectural decision should produce something visible in the admin dashboard.
6. **Async by design** — webhook processing and payment retries run through a message queue, not synchronous DB polling — failures are visible, recoverable, and demonstrable.
7. **Every payment has a policy context** — transactions must be traceable to a policy number or claim reference for regulatory audit.
8. **Payout is as important as collection** — the system handles both inbound premium collection from policyholders and outbound claims disbursement to beneficiaries.
9. **Downstream actions are durable** — a successful payment publishes an event to a durable notification queue; downstream consumers (insurance activation, notifications) run independently and survive consumer restarts without message loss.

---

## 3. Target Users

### Primary Persona: FYP Examiner / Technical Panel
- Assesses system design, code quality, and problem-solving depth
- Expects to see intelligent behavior, not just a CRUD app
- Key need: understand *what is novel* within 10 minutes of the demo

### Secondary Persona: Insurance Payment Operations Manager (Demo Role)
- A fictional insurance operator managing premium collection and claims payouts across MY/ID/PH
- Manages premium collection campaigns for policyholders and processes outbound claim disbursements
- Wants to configure routing rules without writing code and generate fee reconciliation reports for compliance
- Key need: visibility into why transactions succeed or fail, traceability by policy/claim reference, and ability to tune routing behavior

### Technical Context
- The developer (student) is the sole builder
- Tech stack: Spring Boot 3, React 18 + TypeScript + Ant Design (frontend pivoted from Angular 17), PostgreSQL
- Demo environment is a local machine or VPS with public webhook URL (e.g., via ngrok)

---

## 4. MVP Scope

### Core Functionality
- ✅ Insurance premium collection with intelligent provider routing
- ✅ Claims disbursement (outbound payout) via `POST /payments/disburse`
- ✅ Policy/claim reference fields on transactions (`policy_number`, `claim_reference`, `payment_type`)
- ✅ `PaymentType` enum: `PREMIUM_COLLECTION`, `CLAIM_PAYOUT`, `REFUND`
- ✅ Admin transaction filter by `paymentType`
- ✅ Payment initiation with intelligent provider routing
- ✅ Routing engine with three strategies: region-based, success-rate-based, lowest-fee
- ✅ Composite provider scoring (success rate 50%, fee 30%, latency 20%)
- ✅ Configurable routing rules (priority-ordered, region/amount/currency filters)
- ✅ Routing rule simulation — test a hypothetical payment against live rules
- ✅ Automatic failover when primary provider is unavailable
- ✅ Webhook handling with HMAC signature verification per provider
- ✅ Async webhook processing via RabbitMQ (decoupled receipt from processing)
- ✅ Retry queue with exponential backoff using RabbitMQ TTL + dead letter exchange
- ✅ Dead Letter Queue (DLQ) — exhausted-retry payments visible in admin dashboard
- ✅ Idempotency — duplicate payment requests return cached response
- ✅ Full transaction event timeline (immutable audit trail per transaction)
- ✅ Admin dashboard: KPI cards, transaction list, provider health, routing rule management
- ✅ Live failover demo mode — disable a provider via dashboard, next payment auto-reroutes
- ✅ Fee comparison display — show cost difference between providers for a given transaction
- ✅ DB-driven payment methods — `payment_methods` table with composite PK (code, region); admins can add, rename, activate/deactivate methods per region without a code deploy
- ✅ Payment methods admin page — CRUD UI grouped by region; independent per-region active toggle
- ✅ Post-payment notification queue — durable RabbitMQ queue receives a `PaymentSucceededEvent` after every successful payment; consumer activates/disburses the linked insurance policy record
- ✅ Notification consumer runtime toggle — admin can stop/start the consumer at runtime; messages accumulate visibly in the queue and drain cleanly on restart (proves durability for demo)
- ✅ Insurance Payment Demo — admin-managed `demo_policies` table with seed records; a Pay button per row pre-fills the payment form and locks after submission to prevent duplicates
- ✅ Policy status lifecycle — PENDING → ACTIVATED (premium) / DISBURSED (claim) driven by the notification consumer; optimistic UI update flips status instantly on payment success
- ✅ Payment gateway redirect — successful initiation auto-opens the provider's hosted payment page in a new tab (non-localhost URLs only); a manual "Open Payment Page" button persists in the result card
- ✅ Duplicate payment prevention — `submittedIds` set locks the Pay button the moment the form is submitted; only released on error so the user can retry; optimistic cache update prevents re-submit after success

### Providers
- ✅ Billplz sandbox (Malaysia — FPX bank transfer)
- ✅ Midtrans sandbox (Indonesia — Virtual Account, QRIS)
- ✅ PayMongo sandbox (Philippines — Maya, cards)
- ✅ Mock provider (controllable success/failure, simulates any region/method)
- ❌ Direct FPX PayNet API (requires business registration)
- ❌ TNG eWallet direct API (no public sandbox)
- ❌ GCash direct API (no sandbox exists)
- ❌ GrabPay direct API (requires merchant account)

### Technical
- ✅ Spring Boot 3 Maven multi-module backend
- ✅ PostgreSQL with Flyway versioned migrations
- ✅ Spring Security + JWT (stateless access token + DB-tracked refresh token)
- ✅ REST API with OpenAPI/Swagger documentation
- ✅ React 18 + TypeScript + Ant Design admin SPA (pivoted from Angular 17)
- ✅ RabbitMQ for async webhook processing, retry queue, and post-payment notification queue
- ✅ Dead Letter Queue (DLQ) for exhausted-retry transactions
- ✅ Provider metrics aggregation (15-minute rolling window via scheduled job)
- ✅ Audit log for all admin actions
- ❌ Apache Kafka (over-engineered for this scale — RabbitMQ is the correct tool)
- ❌ Mobile app
- ❌ Multi-tenant (multi-merchant) support
- ❌ Real money transactions
- ❌ PCI DSS compliance
- ❌ Card tokenization / vaulting
- ❌ Subscription / recurring billing (no scheduler infrastructure — future phase)
- ❌ Grace period / policy lapse logic (insurance business rules — future phase)
- ❌ Beneficiary bank account management (out of scope — FYP demo)

### Deployment
- ✅ Local development with Docker Compose (PostgreSQL + RabbitMQ)
- ✅ Webhook exposure via ngrok for sandbox callbacks
- ✅ Environment-specific config (dev/prod profiles)
- ❌ Cloud deployment (AWS/GCP) — optional stretch goal
- ❌ CI/CD pipeline

---

## 5. User Stories

### US-1: Intelligent Payment Routing
**As a** merchant submitting a payment from Indonesia,
**I want** the system to automatically select the best available provider,
**so that** I don't have to hardcode provider logic or manually handle failures.

*Example:* POST `/api/v1/payments/initiate` with `region: ID`, `amount: 50000 IDR` → system scores Midtrans (VA) highest → routes there → returns redirect URL.

---

### US-2: Live Failover Recovery
**As a** merchant watching a live demo,
**I want** to see the system automatically recover when a provider goes down,
**so that** I understand the resilience value of orchestration vs. direct integration.

*Example:* Admin disables Midtrans in the dashboard → next Indonesian payment scores Midtrans 0 → routes to Mock fallback → transaction completes → event log shows "Provider Midtrans unavailable, routed to MOCK (fallback)."

---

### US-3: Routing Rule Configuration
**As an** admin,
**I want** to create rules that force specific providers for certain regions or amounts,
**so that** I can implement business logic (e.g., "always use Billplz for MY transactions under RM 50") without code changes.

*Example:* Create rule: `region=MY, max_amount=50, preferred_provider=BILLPLZ, priority=1` → all qualifying Malaysian payments skip the scoring engine and go straight to Billplz.

---

### US-4: Routing Rule Simulation
**As an** admin,
**I want** to test what provider a hypothetical payment would route to before going live,
**so that** I can verify my rules are configured correctly.

*Example:* POST `/api/v1/admin/routing-rules/simulate` with `{region: PH, amount: 500, currency: PHP, method: EWALLET}` → response: `{provider: PAYMONGO, reason: "Rule #3 matched: PH e-wallet", score: 0.91}`.

---

### US-5: Transaction Visibility
**As an** admin,
**I want** to see a full timeline of events for any transaction,
**so that** I can diagnose why a payment succeeded, failed, or is stuck.

*Example:* Click transaction `txn_abc123` → see timeline: INITIATED → ROUTED (to Midtrans, score 0.87) → PROVIDER_CALLED → WEBHOOK_RECEIVED → STATUS_CHANGED (PROCESSING → SUCCESS).

---

### US-6: Provider Cost Comparison
**As an** admin reviewing the dashboard,
**I want** to see total fees paid per provider and the estimated savings from intelligent routing,
**so that** I can justify using the orchestration layer to stakeholders.

*Example:* Dashboard card: "Routing optimization saved RM 124.50 this week by preferring Billplz over Xendit for low-value MY transactions."

---

### US-7: Webhook Idempotency
**As a** provider sending duplicate webhook callbacks,
**I want** the system to process the first and silently ignore duplicates,
**so that** transactions don't get double-processed or status gets corrupted.

*Example:* Midtrans fires the same `payment.success` webhook twice → second call hits `idempotency_records` table → returns 200 with cached response → transaction status unchanged.

---

### US-9: Dead Letter Queue Visibility
**As an** admin,
**I want** to see payments that have exhausted all retry attempts in a dedicated DLQ view,
**so that** I can identify stuck transactions and take manual action (re-queue or mark failed).

*Example:* Payment fails on Midtrans → enters retry queue → retried 3 times with exponential backoff (30s, 60s, 120s) → still failing → moves to DLQ → admin sees it in dashboard under "Dead Letter Queue" with full error history → clicks "Re-queue" after provider is restored.

---

### US-10: Insurance Policy Context
**As an** insurance admin reviewing transactions,
**I want** every payment to carry a policy number or claim reference,
**so that** I can trace any transaction back to a specific policy in the audit log.

*Example:* POST `/payments/initiate` with `policyNumber: "POL-2026-MY-00123"` → stored on transaction → visible in admin transaction detail → reconciliation report links fee to that policy.

---

### US-11: Claims Disbursement
**As an** insurance operator,
**I want** to initiate outbound claim payouts to policyholders via the same routing layer,
**so that** the system selects the lowest-fee provider for the disbursement region automatically.

*Example:* POST `/payments/disburse` with `claimReference: "CLM-456"`, `amount: 5000 MYR`, `region: MY` → routing engine selects Billplz FPX for lowest-fee MYR payout → returns disbursement status and transaction ID.

---

### US-12: Payment Type Filtering
**As an** admin,
**I want** to filter the transaction list by payment type (premium collection vs claim payout),
**so that** I can generate separate reconciliation reports for underwriting and claims departments.

*Example:* GET `/admin/transactions?paymentType=CLAIM_PAYOUT` → returns only outbound payout transactions → admin exports for claims department compliance reporting.

---

### US-8: Mock Provider Demo Control
**As a** developer demoing the system,
**I want** to configure the Mock provider to simulate failures, delays, or specific responses,
**so that** I can reliably demonstrate failover and retry behavior without needing a real provider to fail.

*Example:* Set Mock provider to `FAIL` mode → initiate payment → system retries twice → falls back to real provider → demo complete without any real-world dependency.

---

### US-13: Post-Payment Insurance Activation
**As an** insurance operator,
**I want** premium collection and claim disbursement payments to automatically trigger downstream insurance actions (policy activation, claim payout confirmation),
**so that** the payment event drives insurance state changes without manual reconciliation.

*Example:* Payment succeeds → `PaymentSucceededEvent` published → `NotificationConsumer` picks it up → writes `PREMIUM_ACTIVATED` event to transaction timeline → marks the linked demo policy as `ACTIVATED`.

---

### US-14: Notification Queue Durability Demo
**As a** developer demoing the system to an examiner,
**I want** to stop the notification consumer at runtime so queued messages visibly accumulate, then restart it so they drain instantly,
**so that** I can prove RabbitMQ guarantees message durability — no events are lost when the consumer is offline.

*Example:* Providers page → Notification Queue panel → toggle consumer OFF → initiate 5 payments → queue depth climbs to 5 → toggle ON → depth drains to 0 in seconds → transaction timelines each show `PREMIUM_ACTIVATED`.

---

### US-15: Insurance Payment Operations Demo
**As a** demo user simulating an insurance operations manager,
**I want** to see a table of pre-loaded policies and claims with a Pay button per row,
**so that** the demo looks like a real insurance back-office system rather than a bare payment form.

*Example:* Payment Demo page shows "Premium Collection" and "Claims Disbursement" tabs, each with a table of seeded records. Clicking Pay pre-fills the form with the policy number, region, and amount. After payment succeeds, the row turns green (ACTIVATED / DISBURSED) without any manual refresh.

---

### US-16: Duplicate Payment Prevention
**As a** demo user,
**I want** the Pay button to lock immediately after I click it — even before the API responds — and stay locked once a payment is submitted,
**so that** I cannot accidentally create duplicate charges for the same policy by double-clicking or re-navigating.

*Example:* Click Pay → button becomes disabled immediately → payment pending → success → policy status flips to ACTIVATED → button remains disabled. Navigating away and back still shows the locked state until the page reloads (or policy status refreshes from the DB).

---

## 6. Core Architecture & Patterns

### Architecture Style
Hexagonal Architecture (Ports & Adapters) for the backend. The core domain never depends on provider SDKs — all provider communication goes through a `PaymentProviderPort` interface. Adding a new provider = one new adapter class, zero changes to the routing engine or payment service.

### Maven Module Structure
```
payment-orchestration-backend/          (parent POM)
├── pos-common/                         (enums, DTOs, exceptions, utils)
├── pos-domain/                         (JPA entities + Spring Data repositories)
├── pos-provider/                       (PaymentProviderPort interface + all adapters)
├── pos-routing/                        (routing engine, strategies, scorer)
├── pos-payment/                        (payment service, webhook, retry, idempotency)
├── pos-admin/                          (dashboard, rule management, metrics)
└── pos-api/                            (controllers, security, filters — runnable app)
```

**Dependency order (build bottom-up):**
```
pos-common → pos-domain → pos-provider ┐
                        → pos-routing  ┤→ pos-payment → pos-admin → pos-api
```

### React Frontend Structure
```
payment-orchestration-frontend/src/
├── lib/                   (axios instance, endpoints.ts)
├── layouts/               (AppLayout — Sider + Header + Outlet)
├── shared/
│   ├── components/        (RequireAuth)
│   └── types/             (transaction, feeRate, recon, paymentMethod, enums)
└── features/
    ├── auth/              (/login)
    ├── dashboard/         (/dashboard — KPIs, charts, provider breakdown)
    ├── transactions/      (/transactions — filterable table + event timeline)
    ├── routing-rules/     (/routing-rules — CRUD table + simulate panel)
    ├── providers/         (/providers — health, toggle, fee config)
    ├── fee-rates/         (/fee-rates — inline-editable table by provider/region)
    ├── payment-methods/   (/payment-methods — CRUD grouped by region, active toggle)
    ├── metrics/           (/metrics — success rate + latency charts)
    ├── reconciliation/    (/reconciliation — recon statements + anomaly filter)
    ├── dead-letter-queue/ (/dead-letter-queue — RETRY_EXHAUSTED transactions)
    └── payment-demo/      (/payment-demo — trigger test payments, show routing decision)
```

### Key Design Patterns
- **Port & Adapter** — `PaymentProviderPort` is the core contract; all 4 providers implement it
- **Strategy Pattern** — `RoutingStrategy` interface with `RegionBasedStrategy`, `SuccessRateStrategy`, `LowestFeeStrategy`
- **Composite Scoring** — `ProviderScorer` assigns weighted scores: success rate (50%) + fee (30%) + latency (20%)
- **Idempotency Filter** — servlet filter intercepts requests with `Idempotency-Key` header before hitting service layer
- **Immutable Event Log** — `transaction_events` table is append-only; no updates, only inserts
- **Scheduled Metrics** — `MetricsAggregator` runs every 15 minutes to compute rolling success rates per provider per region
- **Message Queue (Async)** — RabbitMQ decouples webhook receipt from processing, and drives the retry pipeline via TTL + DLQ

### RabbitMQ Topology
```
Exchanges & Queues:

[Provider Webhook]  → webhook.exchange (direct)
                           └→ webhook.queue              (WebhookProcessorConsumer)
                                 └→ DLX on failure → webhook.dlq (manual review)

[Payment Retry]     → retry.exchange (direct)
                           └→ retry.q.30s   (TTL: 30s,  DLX: retry.exchange)
                           └→ retry.q.60s   (TTL: 60s,  DLX: retry.exchange)
                           └→ retry.q.120s  (TTL: 120s, DLX: retry.exchange)
                                 └→ after 3 attempts → payment.dlq (DLQ — admin visible)

[Payment Success]   → notification.exchange (direct)
                           └→ payment.notification.queue (NotificationConsumer — toggleable)
                                 → writes TransactionEvent (PREMIUM_ACTIVATED / CLAIM_DISBURSED)
                                 → marks linked demo_policy record ACTIVATED / DISBURSED
                                 No TTL, no DLX — messages persist until consumer processes them
```

**Why RabbitMQ, not Kafka:**
- RabbitMQ is purpose-built for task queues, routing, and dead letter patterns
- Kafka is a log-streaming platform designed for millions of events/second — overkill for this scale
- RabbitMQ's dead letter exchange (DLX) + message TTL gives native exponential backoff without custom code
- Spring AMQP integrates with Spring Boot trivially (`@RabbitListener`, `RabbitTemplate`)
- A technical examiner asking "why not Kafka?" has a clear, correct answer

---

## 7. Core Features

### Feature 1: Routing Engine
The heart of the system. Given a payment request, evaluates:
1. **Active routing rules** (priority-ordered, first match wins)
2. If no rule matches: **composite scoring** across all available providers for the region
3. Returns a `RoutingDecision` with: chosen provider, fallback provider, strategy used, human-readable reason, composite score

Routing Decision factors:
- Provider `is_enabled` (hard gate — disabled providers score 0)
- Provider supports the request's region and currency
- Historical success rate (from `provider_metrics` rolling window)
- Fee for this transaction amount
- Average latency

### Feature 2: PaymentProviderPort Contract
Every provider implements:
```
initiatePayment(request)                         → redirect URL or direct result
queryPaymentStatus(txnId)                        → current status poll
initiateRefund(request)                          → refund result
verifyWebhookSignature(body, headers)            → boolean
parseWebhookPayload(body)                        → normalized WebhookParseResult
calculateFee(amount, currency, paymentMethod)    → BigDecimal (paymentMethod is String)
supportedMethods()                               → List<String> (e.g. ["FPX","CARD","EWALLET"])
isAvailable()                                    → boolean (circuit breaker backed)
```

Payment methods are DB-managed strings, not a Java enum. The `payment_methods` table (V20) stores available codes per region with an `is_active` flag that admins can toggle at runtime.

### Feature 3: Mock Provider
Configurable behavior via admin dashboard or `application.yml`:
- **ALWAYS_SUCCESS** — all payments succeed immediately
- **ALWAYS_FAIL** — all payments fail (triggers failover demo)
- **RANDOM** — configurable % success rate
- **DELAYED** — succeeds but takes N seconds (tests timeout handling)
- Supports all regions and currencies — stands in for any real provider during demo

### Feature 4: Async Webhook Processing (RabbitMQ)
```
POST /webhooks/{provider}
  → IdempotencyCheck (already processed? return cached 200)
  → SignatureVerification (HMAC per provider — reject if invalid)
  → WebhookLog insert (raw body + headers, signature_valid=true)
  → Publish WebhookReceivedEvent to webhook.queue
  → Return 200 immediately (provider gets fast ACK)

[Async — WebhookProcessorConsumer]
  → Consume from webhook.queue
  → PayloadParsing (normalize to WebhookParseResult)
  → TransactionStatusUpdate
  → TransactionEvent insert
  → ACK message
  → On failure: NACK → RabbitMQ routes to webhook.dlq
```

**Why async matters:** Providers expect a fast 200 response (typically < 5s timeout). If your processor is slow or throws, the provider retries the webhook indefinitely. By ACKing immediately and processing async, you decouple receipt reliability from processing reliability.

### Feature 5: Admin Dashboard
Key screens:
- **Dashboard Home** — total transactions, overall success rate, total volume by currency, active providers count, recent failures list
- **Volume Chart** — transaction count over time (hour/day/week granularity)
- **Provider Breakdown** — per-provider success rate, transaction count, total fees, average latency (last 24h)
- **Transaction List** — filterable by status/provider/region/currency/date range, CSV export
- **Transaction Detail** — full event timeline, routing decision explanation, provider response
- **Routing Rules** — priority-ordered list, create/edit modal, enable/disable toggle, drag-to-reorder, **simulate panel**
- **Provider Config** — enable/disable, edit fee structure, view live health status; **Notification Queue Panel** at the bottom shows live queue depth and consumer on/off toggle
- **Dead Letter Queue Panel** — list of transactions that exhausted all retries, with error history and "Re-queue" / "Mark Failed" actions
- **Payment Demo** — DB-backed policy/claim table with Pay button per row; clicking Pay pre-fills the form; routing decision result shown after initiation including provider redirect link

### Feature 6: Retry Queue with Dead Letter Queue (RabbitMQ)

Replaces the naive `@Scheduled` DB polling approach with event-driven retries:

```
Payment fails or times out
  → PublishRetryMessage { transactionId, attemptNumber, providerUsed }
  → retry.queue with TTL = backoff_ms(attemptNumber)
       attempt 1: TTL 30,000ms  (30 seconds)
       attempt 2: TTL 60,000ms  (60 seconds)
       attempt 3: TTL 120,000ms (120 seconds)
  → On TTL expiry: message routed back to RetryConsumer
  → RetryConsumer: calls queryPaymentStatus() on provider
       → If SUCCESS/FAILED: update transaction, done
       → If still PROCESSING + attempts < 3: re-publish with attempt+1
       → If attempts == 3: publish to payment.dlq
  → DLQ consumer: marks transaction RETRY_EXHAUSTED, writes event, notifies dashboard
```

**Demo moment:** Set Mock provider to DELAYED mode → initiate payment → watch retry queue drain through 3 attempts on the dashboard → transaction appears in DLQ panel → admin clicks "Re-queue" after switching Mock to SUCCESS mode → transaction completes.

### Feature 7: Routing Rule Simulate
A POST endpoint and matching UI panel where you input:
- Region, amount, currency, payment method
Returns:
- Which rule matched (or "no rule — scored automatically")
- Which provider was selected
- Provider score breakdown (success_rate contribution, fee contribution, latency contribution)
- Fallback provider
- Human-readable routing reason

### Feature 8: Post-Payment Notification Queue
After every successful payment, `PaymentService` publishes a `PaymentSucceededEvent` to a durable RabbitMQ queue (`payment.notification.queue`). Three call sites cover all success paths:

1. **Direct success** (Mock ALWAYS_SUCCESS) — published immediately after provider responds SUCCESS in `initiatePayment()`
2. **Webhook-resolved success** — published in `handleWebhook()` with a `previous != SUCCESS` guard to prevent double-publish if retry consumer already resolved it
3. **Retry-resolved success** — published by `RetryConsumer` after a polled status flip to SUCCESS

The `NotificationConsumer` processes each event and:
- Writes a `PREMIUM_ACTIVATED` or `CLAIM_DISBURSED` entry to `transaction_events`
- Locates the linked `demo_policy` record by `policy_number` (premium) or `claim_reference` (disbursement) and updates its status to `ACTIVATED` / `DISBURSED`

The consumer is declared with `id = "notificationConsumer"` and `autoStartup = "true"`. At runtime, admin can call `POST /admin/notification-queue/consumer/stop` and `start` to toggle it. `GET /admin/notification-queue/status` returns `{ consumerActive, queueDepth }` polled every 3 seconds by the frontend Notification Queue Panel.

**Queue characteristics:** Durable, no TTL, no DLX. Messages survive broker restarts and consumer outages — they simply accumulate until the consumer comes back online.

**Demo moment:** Stop consumer → initiate 4–5 successful payments → watch queue depth climb in the panel → start consumer → depth drains to 0 in seconds → all policy rows turn green simultaneously.

### Feature 9: Insurance Payment Demo
The `/payment-demo` page is a simulated insurance back-office system, not just a raw payment form.

**Policy table:** Admin-managed records from the `demo_policies` table. Two tabs:
- **Premium Collection** — policyholder records with region, amount, policy number, status
- **Claims Disbursement** — claim records with claim reference, region, amount, status

**Pay button flow:**
1. Admin clicks Pay on a pending row
2. Form below the table is pre-filled (region, amount, currency, policy number / claim reference are read-only)
3. Form submits → `Idempotency-Key` UUID generated → `POST /payments/initiate`
4. On success: provider's payment page auto-opens in a new tab (non-localhost URLs); result card shows routing decision + "Open Payment Page" button
5. Policy row status flips to ACTIVATED/DISBURSED via optimistic cache update (no page refresh needed); then confirmed from DB via `refetchInterval: 4000`

**Duplicate prevention:**
- Pay button is added to `submittedIds` set the moment the form submits — before the API responds
- Button stays disabled as long as the policy is not PENDING or is in `submittedIds`
- On API error: policy removed from `submittedIds` so the user can retry
- Mutation variables carry the `policy` object to avoid React closure staleness in `onSuccess`/`onError`

---

## 8. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 21 | Language |
| Spring Boot | 3.x | Framework |
| Spring Security | 6.x | Auth |
| Spring Data JPA | 3.x | ORM |
| RabbitMQ | 3.x | Message broker (webhook queue + retry queue + DLQ) |
| Spring AMQP | 3.x | RabbitMQ integration (`@RabbitListener`, `RabbitTemplate`) |
| Maven | 3.9+ | Build / multi-module |
| PostgreSQL | 15+ | Primary database |
| Flyway | 9.x | Database migrations |
| Lombok | latest | Boilerplate reduction |
| MapStruct | 1.5+ | DTO↔Entity mapping |
| JJWT | 0.12+ | JWT creation/validation |
| Springdoc OpenAPI | 2.x | Swagger UI |
| Testcontainers | 1.19+ | Integration tests with real PostgreSQL |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | SPA framework |
| TypeScript | 5.x | Language |
| Vite | latest | Build tool |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Server state / data fetching |
| Axios | latest | HTTP client (JWT interceptor) |
| Ant Design (antd) | 5.x | UI component library |
| Recharts | latest | Charts (volume, provider breakdown) |

### Provider Sandbox Accounts
| Provider | Region | Methods | Sandbox |
|---|---|---|---|
| Billplz | Malaysia | FPX bank transfer | Free, no registration required |
| Midtrans | Indonesia | Virtual Account, QRIS, GoPay | Free sandbox at midtrans.com |
| PayMongo | Philippines | Maya, cards, e-wallets | Free, immediate at paymongo.com |
| Mock | All | Configurable | Built-in, no external account |

### Dev Tools
- Docker Compose — PostgreSQL + RabbitMQ local instances
- RabbitMQ Management UI — built-in at `http://localhost:15672` (queue depths, message rates, DLQ inspection)
- ngrok — expose localhost for sandbox webhooks
- Postman — API testing collection

---

## 9. Security & Configuration

### Authentication
- Login → Spring Security validates credentials → returns short-lived JWT access token (15 min) + long-lived refresh token (7 days)
- Refresh token stored in `users` table (server-side invalidation on logout)
- All `/api/v1/admin/**` endpoints require `ADMIN` or `VIEWER` role
- All `/api/v1/payments/**` endpoints require `MERCHANT` role or `ADMIN`
- All `/api/v1/webhooks/**` endpoints are public but HMAC-verified at the application layer

### Idempotency
- Client sends `Idempotency-Key: <uuid>` header with every POST to `/payments/initiate`
- `IdempotencyFilter` checks `idempotency_records` table before request reaches service
- If key exists and request hash matches: return cached response (200)
- If key exists but hash differs: return 422 (different request, same key)
- Records expire after 24 hours (cleanup job runs nightly)

### Webhook Security
- Each provider has a `webhook_secret` stored in `provider_configs`
- Verification is HMAC-SHA256 for Billplz and Midtrans, RSA for PayMongo
- Mock provider always passes verification
- All inbound webhooks logged to `webhook_logs` with `signature_valid` flag — even failed verifications are logged

### Environment Configuration
```yaml
# application.yml (non-sensitive)
routing:
  scorer:
    success-rate-weight: 0.50
    fee-weight: 0.30
    latency-weight: 0.20
  metrics:
    window-minutes: 60
    refresh-interval-minutes: 15

# application-dev.yml (dev secrets — gitignored)
spring.datasource.url: jdbc:postgresql://localhost:5432/pos_dev
jwt.secret: <dev-secret>
providers:
  billplz.api-key: <sandbox-key>
  midtrans.server-key: <sandbox-key>
  paymongo.secret-key: <sandbox-key>
  mock.default-mode: ALWAYS_SUCCESS
```

### Security Scope
- ✅ JWT authentication and role-based authorization
- ✅ HMAC webhook signature verification
- ✅ SQL injection prevention (parameterized queries via JPA)
- ✅ Sensitive config externalized (never hardcoded)
- ❌ PCI DSS compliance (out of scope — no real card data)
- ❌ Rate limiting (out of scope for MVP)
- ❌ DDoS protection (out of scope)

---

## 10. API Specification

Base URL: `/api/v1`

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Returns access + refresh token |
| POST | `/auth/refresh` | Public | Rotates access token |
| POST | `/auth/logout` | Bearer | Invalidates refresh token |
| GET | `/auth/me` | Bearer | Current user profile |

### Payments
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/initiate` | Bearer | Initiate + route payment. Requires `Idempotency-Key` header. |
| GET | `/payments/{id}/status` | Bearer | Poll transaction status |
| POST | `/payments/{id}/refund` | Bearer | Initiate refund |
| GET | `/payments/{id}/events` | Bearer | Full event timeline |

**Initiate Payment Request:**
```json
{
  "merchantOrderId": "ORDER-001",
  "policyNumber": "POL-2026-MY-00123",
  "claimReference": null,
  "paymentType": "PREMIUM_COLLECTION",
  "amount": 50.00,
  "currency": "MYR",
  "region": "MY",
  "customerEmail": "user@example.com",
  "description": "Monthly premium — Policy POL-2026-MY-00123",
  "redirectUrl": "https://insurer.com/payment/result",
  "metadata": { "policyType": "life", "coveragePeriod": "2026-04" }
}
```

**Initiate Payment Response:**
```json
{
  "transactionId": "txn_uuid",
  "status": "PENDING",
  "provider": "BILLPLZ",
  "paymentType": "PREMIUM_COLLECTION",
  "policyNumber": "POL-2026-MY-00123",
  "routingReason": "Rule #2 matched: MY region, amount < RM100",
  "redirectUrl": "https://billplz.com/bills/abc123",
  "fee": 0.30,
  "createdAt": "2026-03-30T10:00:00Z"
}
```

### Payments — Disbursement (Claims Payout)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/disburse` | Bearer | Initiate outbound claim payout. Requires `Idempotency-Key` header. `paymentType` defaults to `CLAIM_PAYOUT`. |

Request mirrors `/payments/initiate` with `claimReference` (required) and `policyNumber` (optional). `paymentType` is automatically set to `CLAIM_PAYOUT`.

### Webhooks (No JWT — HMAC verified)
| Method | Path |
|---|---|
| POST | `/webhooks/billplz` |
| POST | `/webhooks/midtrans` |
| POST | `/webhooks/paymongo` |
| POST | `/webhooks/mock` |

### Admin — Transactions
| Method | Path | Description |
|---|---|---|
| GET | `/admin/transactions` | Filter: status, provider, region, currency, paymentType, dateFrom, dateTo, page, size |
| GET | `/admin/transactions/{id}` | Detail + event timeline |
| GET | `/admin/transactions/export` | CSV export |

### Admin — Routing Rules
| Method | Path | Description |
|---|---|---|
| GET/POST | `/admin/routing-rules` | List all / Create new |
| GET/PUT/DELETE | `/admin/routing-rules/{id}` | Single rule CRUD |
| PATCH | `/admin/routing-rules/{id}/toggle` | Enable/disable without full edit |
| POST | `/admin/routing-rules/reorder` | Bulk priority update |
| POST | `/admin/routing-rules/simulate` | Test hypothetical payment against rules |

**Simulate Request/Response:**
```json
// Request
{ "region": "ID", "amount": 100000, "currency": "IDR", "method": "VIRTUAL_ACCOUNT" }

// Response
{
  "selectedProvider": "MIDTRANS",
  "matchedRule": null,
  "strategy": "COMPOSITE_SCORE",
  "reason": "No rule matched. Midtrans scored highest: success_rate=0.96, fee=0.015, latency=340ms",
  "scoreBreakdown": {
    "MIDTRANS": { "total": 0.89, "successRateScore": 0.48, "feeScore": 0.27, "latencyScore": 0.14 },
    "MOCK":     { "total": 0.50, "successRateScore": 0.25, "feeScore": 0.15, "latencyScore": 0.10 }
  },
  "fallbackProvider": "MOCK"
}
```

### Admin — Providers
| Method | Path | Description |
|---|---|---|
| GET | `/admin/providers` | List all with current status |
| GET/PUT | `/admin/providers/{provider}` | Get / update config |
| PATCH | `/admin/providers/{provider}/toggle` | Enable/disable |
| GET | `/admin/providers/{provider}/metrics` | Success rate, fees, latency. `?period=1h,24h,7d` |
| GET | `/admin/providers/{provider}/health` | Live health check |

### Admin — Dashboard
| Method | Path |
|---|---|
| GET | `/admin/dashboard/summary` |
| GET | `/admin/dashboard/volume-chart?granularity=hour` |
| GET | `/admin/dashboard/provider-breakdown` |
| GET | `/admin/dashboard/region-breakdown` |
| GET | `/admin/dashboard/recent-failures` |

### Admin — Demo Policies
| Method | Path | Description |
|---|---|---|
| GET | `/admin/demo-policies` | List all demo policies ordered by created_at asc |
| POST | `/admin/demo-policies` | Create a new policy or claim record for the demo |
| DELETE | `/admin/demo-policies/{id}` | Delete a demo policy record |

**Create Demo Policy Request:**
```json
{
  "holderName": "Ahmad bin Yusof",
  "holderEmail": "ahmad@example.com",
  "insuranceType": "Life",
  "policyNumber": "POL-2026-MY-00101",
  "claimReference": null,
  "amount": 120.00,
  "currency": "MYR",
  "region": "MY",
  "paymentMethod": "FPX",
  "paymentType": "PREMIUM_COLLECTION"
}
```

**Demo Policy Status values:** `PENDING` → `ACTIVATED` (premium) or `DISBURSED` (claim disbursement)

### Admin — Notification Queue
| Method | Path | Description |
|---|---|---|
| GET | `/admin/notification-queue/status` | Returns `{ consumerActive: boolean, queueDepth: long }` |
| POST | `/admin/notification-queue/consumer/start` | Starts the notification consumer |
| POST | `/admin/notification-queue/consumer/stop` | Stops the notification consumer |

**Status Response:**
```json
{
  "success": true,
  "data": {
    "consumerActive": true,
    "queueDepth": 0
  }
}
```

---

## 11. Success Criteria

### MVP Success Definition
The system is considered MVP-complete when an examiner can watch a 10-minute demo that includes: a payment routed intelligently, a provider failure with live failover, routing rule configuration affecting the next payment, and a cost comparison — without needing to explain what "payment orchestration" means.

### Functional Requirements
- ✅ Payment initiated via API routes to the correct provider based on region
- ✅ Disabling a provider in the dashboard causes the next payment to route to the fallback
- ✅ Duplicate payment request (same Idempotency-Key) returns cached response, no new transaction created
- ✅ Webhook from provider updates transaction status and appends event to timeline
- ✅ Routing rule with `region=MY` correctly overrides the scoring engine for Malaysian payments
- ✅ Simulate endpoint returns correct provider and score breakdown for test inputs
- ✅ Provider metrics update after each transaction (within 15-minute window)
- ✅ Webhook controller returns 200 immediately; processing happens asynchronously via RabbitMQ
- ✅ Failed payment retried 3 times with exponential backoff; ends up in DLQ if all attempts fail
- ✅ DLQ panel in admin dashboard shows RETRY_EXHAUSTED transactions with re-queue action
- ✅ All endpoints return consistent `ApiResponse<T>` envelope format
- ✅ Swagger UI at `/swagger-ui.html` documents all endpoints with examples
- ✅ Successful payment publishes `PaymentSucceededEvent` to durable `payment.notification.queue`
- ✅ Notification consumer writes `PREMIUM_ACTIVATED` / `CLAIM_DISBURSED` event to transaction timeline
- ✅ Stopping the consumer causes messages to queue up; restarting drains them without loss
- ✅ Demo policy table shows PENDING → ACTIVATED / DISBURSED transition driven by the notification consumer
- ✅ Pay button locks immediately on submission and cannot be re-clicked for the same policy
- ✅ Successful non-localhost payments auto-open the provider's hosted payment page in a new tab

### Demo Quality Goals
- ✅ Failover demo is reproducible on demand (Mock provider toggle)
- ✅ Transaction event timeline shows every step with timestamp and routing reason
- ✅ Dashboard loads with realistic seeded data (100+ transactions across all 3 regions)
- ✅ Cost savings card shows dollar/ringgit/peso figures, not percentages alone
- ✅ Notification queue depth counter updates live (3-second poll) during the consumer stop/start demo
- ✅ Policy table rows change color instantly after payment success (optimistic update) without page refresh

---

## 12. Implementation Phases

### Phase 1 — Foundation (Weeks 1–2)
**Goal:** Running app with real data flow, JWT auth, and Mock provider working end-to-end.

- ✅ Parent POM + all 7 Maven modules scaffolded
- ✅ `pos-common`: all enums (PaymentStatus, Region, Currency, Provider), DTOs, exceptions
- ✅ `pos-domain`: JPA entities + Flyway migrations V1–V7 + repositories
- ✅ Spring Security + JWT: `/auth/login` returns valid JWT
- ✅ Mock provider: full `PaymentProviderPort` implementation, in-memory state, toggleable mode
- ✅ RabbitMQ setup: Docker Compose service + Spring AMQP config + exchange/queue/DLQ topology declared on startup
- ✅ Basic `PaymentController`: `/payments/initiate` writes transaction, calls Mock, returns response

**Validation:** Postman: login → JWT → initiate payment → see `transactions` row in DB. RabbitMQ Management UI at `:15672` shows `webhook.queue` and `payment.dlq` declared.

---

### Phase 2 — Core Payment Flow (Weeks 3–4)
**Goal:** Full payment lifecycle working end-to-end with Mock provider.

- ✅ `RoutingEngine` with `RegionBasedStrategy` (simple region → provider mapping)
- ✅ `PaymentService.initiatePayment()` calls routing engine, writes `transaction_events`
- ✅ `IdempotencyService` + `IdempotencyFilter`
- ✅ `/payments/{id}/status` and `/payments/{id}/events`
- ✅ `WebhookController` publishes to `webhook.queue` (async — returns 200 immediately)
- ✅ `WebhookProcessorConsumer` `@RabbitListener` consumes, processes, updates transaction
- ✅ Retry queue: `RetryPublisher` publishes failed payments with TTL-based backoff
- ✅ `RetryConsumer` handles retries, increments attempt count, routes to DLQ after 3 failures
- ✅ `DlqConsumer` marks transaction `RETRY_EXHAUSTED`, writes event, available in admin API

**Validation:** Full lifecycle: initiate → mock webhook arrives → queued → consumed → SUCCESS. Set Mock to FAIL → watch 3 retry attempts in RabbitMQ UI → transaction appears in DLQ.

---

### Phase 3 — Smart Routing + Real Providers (Weeks 5–6)
**Goal:** Routing engine is intelligent. Real sandbox providers connected.

- ✅ `SuccessRateStrategy` + `LowestFeeStrategy` reading from `provider_metrics`
- ✅ `ProviderScorer`: composite score (50/30/20 weights)
- ✅ `MetricsAggregator` scheduled job
- ✅ Billplz adapter + `/webhooks/billplz`
- ✅ Midtrans adapter + `/webhooks/midtrans`
- ✅ PayMongo adapter + `/webhooks/paymongo`
- ✅ `RefundService` + `POST /payments/{id}/refund`
- ✅ `RoutingRuleService` + full CRUD + `/admin/routing-rules/simulate`

**Validation:** Route a real payment to each sandbox. Create a rule that overrides the scorer. Simulate endpoint returns correct breakdown.

---

### Phase 4 — React Admin Dashboard (Weeks 7–8)
**Goal:** Full system demonstrable through browser.

- ✅ Project scaffold: React 18 + TypeScript + Vite + Ant Design, JWT interceptor (Axios), RequireAuth guard
- ✅ Login page + token storage
- ✅ Layout shell: Ant Design Sider + Header, NavLink sidebar, user dropdown
- ✅ Dashboard: KPI cards + Recharts volume chart + provider breakdown
- ✅ Transaction list: filterable, paginated, status badges
- ✅ Routing rules: CRUD table + create/edit modal + simulate panel
- ✅ Providers: health status, toggle, fee config edit
- ✅ Fee Rates: inline-editable table per provider/region
- ✅ Payment Methods: CRUD per region, active toggle (DB-driven)
- ✅ Metrics: success rate + latency charts
- ✅ Reconciliation: recon statement table + anomaly filter
- ✅ Dead Letter Queue: RETRY_EXHAUSTED transactions with re-queue action
- ✅ Payment Demo: DB-backed policy/claim table + payment form + routing result card + gateway redirect
- ✅ Notification Queue Panel: live queue depth counter + consumer on/off toggle (on Providers page)

**Validation:** 10-minute demo walkthrough without touching Postman.

---

### Phase 5 — Polish & FYP Hardening (Weeks 9–10)
**Goal:** Defensible, documented, seeded system ready for submission and viva.

- ✅ Swagger UI with request/response examples for all endpoints
- ✅ Audit log for admin actions (rule created, provider toggled)
- ✅ Consistent `GlobalExceptionHandler` returning `ApiResponse` error format
- ✅ Seed data script: 100+ transactions across all 3 regions and 4 providers
- ✅ Integration tests: `@SpringBootTest` + Testcontainers for `PaymentService` and `RoutingEngine`
- ✅ `application-prod.yml`: externalized secrets, HikariCP tuning
- ✅ Architecture diagram (system flow, ER diagram, provider adapter pattern) for dissertation

---

## 13. Future Considerations

- **Multi-tenant support** — multiple insurance company accounts with isolated routing rules
- **Recurring premium billing** — scheduled payment plans linked to policy renewal dates, with automatic retry on failure
- **Grace period / policy lapse engine** — if premium payment fails, hold policy active for N days before triggering a lapse event, integrating with the existing retry queue
- **Beneficiary management** — store and validate payout bank accounts for claim disbursements
- **Regulatory reporting** — export transaction ledger by policy/claim reference for OJK (Indonesia), BNM (Malaysia), IC (Philippines) compliance audits
- **Machine learning routing** — replace the heuristic scorer with a trained model on historical approval data
- **Real-time dashboard** — WebSocket push for live transaction updates instead of polling
- **A/B routing** — split traffic between providers to empirically measure success rates
- **BNPL providers** — Atome, Kredivo for Indonesia; BillEase for Philippines
- **GCash integration** — when/if GCash opens a developer sandbox
- **TNG eWallet direct API** — via aggregator (2C2P or Checkout.com) with business account
- **Circuit breaker** — Resilience4j circuit breaker per provider (currently just `isAvailable()` flag)
- **Payment analytics** — cohort analysis, decline reason breakdown, time-to-success distribution

---

## 14. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sandbox webhook delivery fails (ngrok disconnects) | High | Always have Mock provider as demo fallback; pre-record a webhook delivery for backup |
| Billplz/Midtrans/PayMongo sandbox API changes | Medium | Pin SDK versions; keep Mock provider behavior identical to real provider for demo-critical flows |
| Routing engine looks like `if/else` to examiners | Medium | The simulate endpoint's score breakdown UI is the proof — show numbers, not just a decision |
| Insufficient time to finish Angular dashboard | Medium | Build backend + Postman demo first; dashboard is enhancement. Core value is the routing engine. |
| GCash "no sandbox" question from examiner | Low | Prepare answer: "GCash has no developer sandbox — an industry-known limitation. We mock it and note this as a real-world constraint the orchestration layer is designed to abstract away." |
| "Why not Kafka?" question from examiner | Low | Prepared answer in Appendix. Short answer: RabbitMQ is the correct tool for task queues at this scale; Kafka is a log-streaming platform designed for millions of events/sec — using it here would be over-engineering with no benefit. |
| RabbitMQ adds complexity mid-project | Medium | RabbitMQ is set up in Phase 1 (Docker Compose), so it's available from day one. Spring AMQP's `@RabbitListener` annotation keeps consumer code simple. The management UI at `:15672` makes it easy to debug. |

---

## 15. Appendix

### Key Provider Documentation
- Billplz API: https://www.billplz.com/api
- Midtrans Docs: https://docs.midtrans.com
- PayMongo Docs: https://developers.paymongo.com
- Maya Developer Hub: https://developers.maya.ph

### Routing Score Formula
```
score(provider) =
  (success_rate_last_1h × 0.50) +
  (1 - normalized_fee × 0.30) +
  (1 - normalized_latency × 0.20)

where:
  normalized_fee     = provider_fee / max_fee_among_eligible_providers
  normalized_latency = provider_avg_latency / max_latency_among_eligible_providers
```

### Database Module Map
| Flyway Migration | Table | Key Columns / Notes |
|---|---|---|
| V1 | `users` | id, email, password_hash, role, refresh_token, token_expires_at |
| V2 | `transactions` | id, merchant_order_id, amount, currency, region, status, provider, routing_reason, fee, idempotency_key |
| V3 | `transaction_events` | id, transaction_id, event_type, description, created_at |
| V4 | `provider_configs` | provider, is_enabled, fee_percentage, webhook_secret, updated_at |
| V5 | `routing_rules` | id, priority, region, currency, max_amount, min_amount, preferred_provider, is_enabled |
| V6 | `provider_metrics` | id, provider, region, success_rate, avg_latency_ms, transaction_count, window_start, window_end |
| V7 | `webhook_logs` | id, provider, transaction_id, raw_body, signature_valid, received_at |
| V8 | `idempotency_records` | idempotency_key, request_hash, response_body, created_at, expires_at |
| V9 | `audit_logs` | id, admin_user, action, entity_type, entity_id, old_value, new_value, created_at |
| V10 | `provider_fee_rates` | provider, region, payment_method, fee_type, fixed_amount, percentage, currency, active |
| V11 | `recon_statements` | transaction_id, provider, region, expected_fee, actual_fee, variance, anomaly |
| V12 | `provider_metrics` (alter) | fee_accuracy_rate column added |
| V13 | `routing_rules` (alter) | strategy column added |
| V14 | seed data | dummy recon + metrics rows |
| V15 | `provider_fee_rates` (alter) | region column added |
| V16 | `recon_statements` (alter) | region column added |
| V17 | `transactions` (alter) | policy_number VARCHAR(100), claim_reference VARCHAR(100), payment_type VARCHAR(30) DEFAULT 'PREMIUM_COLLECTION' |
| V18 | `routing_rules` (alter) | payment_type column added |
| V19 | seed data | insurance-specific routing rules seeded |
| V20 | `payment_methods` (new) | Composite PK (code, region), name VARCHAR(100), is_active BOOLEAN; 13 seed rows; composite FK from transactions, provider_fee_rates, recon_statements |
| V21 | `demo_policies` (new) | id UUID PK, holder_name, holder_email, insurance_type, policy_number, claim_reference, amount DECIMAL(19,4), currency, region, payment_method, payment_type, status VARCHAR(20) DEFAULT 'PENDING', transaction_id UUID, created_at, updated_at; 6 seed rows (4 premium + 2 claims across MY/ID/PH) |

### RabbitMQ Queue Topology (Implementation Reference)
```yaml
# Docker Compose
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"    # AMQP
    - "15672:15672"  # Management UI (guest/guest in dev)

# Exchanges declared on startup (RabbitMQ Config Bean)
webhook.exchange       → direct → webhook.queue
                                    DLX: webhook.dlx → webhook.dlq

retry.exchange         → direct → retry.q.30s  (x-message-ttl: 30000,  DLX: retry.exchange)
                                → retry.q.60s  (x-message-ttl: 60000,  DLX: retry.exchange)
                                → retry.q.120s (x-message-ttl: 120000, DLX: retry.exchange)
                                → payment.dlq  (terminal — after 3 attempts)

notification.exchange  → direct → payment.notification.queue
                                    Durable, no TTL, no DLX
                                    Consumer id: "notificationConsumer" (toggleable at runtime)
                                    Routing key = queue name

# application.yml additions (V1.2)
rabbitmq:
  exchanges:
    notification: notification.exchange
  queues:
    notification: payment.notification.queue
```

### What Makes This Defensible in a Viva
1. **"Why not just use Xendit?"** — Xendit is one of our providers. We route *to* Xendit (or its equivalent). The orchestration layer is what selects *which* provider, when to fail over, and how to optimize cost. Xendit doesn't solve that problem — it is one variable in the solution.
2. **"Is this a real problem?"** — Yes. Grab, Gojek, Shopee, and Lazada all operate internal payment orchestration layers for exactly this reason. This project is a demonstrable, smaller-scale implementation of the same pattern.
3. **"What's novel about your routing algorithm?"** — The composite scorer with tunable weights, region-aware rule engine, and real-time success rate feedback loop. Show the simulate endpoint's breakdown table.
4. **"Why RabbitMQ and not Kafka?"** — RabbitMQ is purpose-built for task queues with routing, TTL, and dead letter patterns. Kafka is a distributed log designed for event streaming at millions of events/second — using it here would be like using a freight train to deliver a letter. RabbitMQ's dead letter exchange gives us native exponential backoff with zero custom scheduling code.
5. **"What happens when a payment gets stuck?"** — Show the DLQ panel. Walk through: provider failure → 3 retry attempts with increasing delays → RETRY_EXHAUSTED status → admin sees it → clicks Re-queue after provider recovers → payment completes. This is a production-grade failure recovery flow.
6. **"Why insurance?"** — Insurance payments are uniquely demanding: premiums must reach the right provider to trigger policy coverage, claim payouts must be fast and traceable to avoid regulatory penalties, and failed payments have real consequences (policy lapse). This makes payment orchestration — not just payment processing — essential in insurance. The same routing engine that minimizes fees for a merchant minimizes delays for a claims payout.
7. **"What happens downstream after a payment succeeds?"** — A `PaymentSucceededEvent` is published to a durable RabbitMQ notification queue. A consumer picks it up and activates the linked insurance policy (or marks the claim as disbursed) by writing to `transaction_events` and updating the `demo_policies` table. You can stop the consumer live, queue up 5 payments, then restart — all 5 process instantly without loss. This proves the system is not tightly coupled: the payment path and the insurance activation path are independent and survivable.
8. **"Isn't the demo policy table just fake data?"** — Yes, intentionally. In production, these records would be pushed in by a separate Policy Administration System (PAS) via the same API. The demo simulates what the PAS would do, so the examiner sees a realistic insurance back-office flow rather than a blank payment form. The `POST /admin/demo-policies` endpoint is exactly the contract a real PAS integration would call.
