# Product Requirements Document
# Payment Orchestration System (POS)
**Version:** 1.1
**Date:** 2026-03-30
**Type:** Final Year Project (FYP)

---

## 1. Executive Summary

The Payment Orchestration System (POS) is a backend-driven platform that intelligently routes payment transactions across multiple payment providers in Southeast Asia — specifically Malaysia, Indonesia, and the Philippines. Rather than integrating directly with a single gateway, the system acts as an intelligent routing layer that sits *above* providers, deciding in real time which provider to use for each transaction based on region, provider success rate, transaction fees, and configurable business rules.

The core value proposition is **resilience and cost optimization**: when a provider is degraded or expensive, the system automatically reroutes to the best available alternative — without the merchant changing anything. This mirrors how large-scale platforms like Grab, Gojek, and Shopee manage payments internally, but packaged as a demonstrable, configurable system with a visual admin dashboard.

The MVP goal is a fully functional routing engine integrated with real sandbox providers (Billplz for Malaysia, Midtrans for Indonesia, PayMongo for the Philippines), with a Mock provider for controlled testing, and an Angular admin dashboard that makes the routing intelligence *visible* — showing live decisions, failover events, cost comparisons, and provider health in real time.

---

## 2. Mission

**Mission Statement:** Demonstrate that intelligent payment routing — not just payment processing — is the differentiating layer for multi-region merchants, by building a configurable orchestration engine that maximizes success rates and minimizes fees across Southeast Asian payment providers.

### Core Principles

1. **The routing engine is the product** — provider integrations are adapters, not the point.
2. **Every routing decision must be explainable** — the system records *why* it chose a provider, not just which one.
3. **Failure is a first-class feature** — the system must handle and *visibly recover from* provider failures.
4. **Sandbox-first realism** — all providers are backed by real sandbox APIs; the Mock provider simulates failure scenarios.
5. **Built to be demonstrated** — every architectural decision should produce something visible in the admin dashboard.
6. **Async by design** — webhook processing and payment retries run through a message queue, not synchronous DB polling — failures are visible, recoverable, and demonstrable.

---

## 3. Target Users

### Primary Persona: FYP Examiner / Technical Panel
- Assesses system design, code quality, and problem-solving depth
- Expects to see intelligent behavior, not just a CRUD app
- Key need: understand *what is novel* within 10 minutes of the demo

### Secondary Persona: Merchant Admin (Demo Role)
- A fictional e-commerce operator managing payments across MY/ID/PH
- Wants to configure routing rules without writing code
- Key need: visibility into why transactions succeed or fail, and ability to tune behavior

### Technical Context
- The developer (student) is the sole builder
- Tech stack is fixed: Spring Boot 3, Angular 17, PostgreSQL
- Demo environment is a local machine or VPS with public webhook URL (e.g., via ngrok)

---

## 4. MVP Scope

### Core Functionality
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
- ✅ Angular 17 standalone components admin SPA
- ✅ RabbitMQ for async webhook processing and retry queue
- ✅ Dead Letter Queue (DLQ) for exhausted-retry transactions
- ✅ Provider metrics aggregation (15-minute rolling window via scheduled job)
- ✅ Audit log for all admin actions
- ❌ Apache Kafka (over-engineered for this scale — RabbitMQ is the correct tool)
- ❌ Mobile app
- ❌ Multi-tenant (multi-merchant) support
- ❌ Real money transactions
- ❌ PCI DSS compliance
- ❌ Card tokenization / vaulting
- ❌ Subscription / recurring billing

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

### US-8: Mock Provider Demo Control
**As a** developer demoing the system,
**I want** to configure the Mock provider to simulate failures, delays, or specific responses,
**so that** I can reliably demonstrate failover and retry behavior without needing a real provider to fail.

*Example:* Set Mock provider to `FAIL` mode → initiate payment → system retries twice → falls back to real provider → demo complete without any real-world dependency.

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

### Angular Project Structure
```
payment-orchestration-frontend/src/app/
├── core/           (auth service, JWT interceptor, guards, models)
├── shared/         (status-badge, data-table, currency-format pipe, has-role directive)
├── layout/         (sidebar, topbar, main-layout shell)
└── features/
    ├── auth/           (/auth — login)
    ├── dashboard/      (/dashboard — KPIs, charts)
    ├── transactions/   (/transactions — list + detail with event timeline)
    ├── routing-rules/  (/admin/routing-rules — CRUD + simulate panel)
    ├── providers/      (/admin/providers — health, toggle, fee config)
    └── payment-demo/   (/demo — trigger test payments, watch routing in real time)
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

[Provider Webhook] → webhook.exchange (direct)
                          └→ webhook.queue          (WebhookProcessorConsumer)
                                └→ DLX on failure → webhook.dlq (manual review)

[Payment Retry]   → retry.exchange (direct)
                          └→ retry.queue (TTL: 30s)  → retry on expiry
                          └→ retry.queue (TTL: 60s)  → retry on expiry
                          └→ retry.queue (TTL: 120s) → retry on expiry
                                └→ after 3 attempts → payment.dlq (DLQ — admin visible)
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
initiatePayment(request)       → redirect URL or direct result
queryPaymentStatus(txnId)      → current status poll
initiateRefund(request)        → refund result
verifyWebhookSignature(body, headers) → boolean
parseWebhookPayload(body)      → normalized WebhookParseResult
calculateFee(amount, currency) → BigDecimal
isAvailable()                  → boolean (circuit breaker backed)
```

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
- **Provider Config** — enable/disable, edit fee structure, view live health status
- **Dead Letter Queue Panel** — list of transactions that exhausted all retries, with error history and "Re-queue" / "Mark Failed" actions
- **Payment Demo** — form to trigger test payments, real-time result with routing explanation

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
| Angular | 17 | SPA framework |
| TypeScript | 5.x | Language |
| ngx-charts | latest | Charts (volume, provider breakdown) |
| Angular Material | 17 | UI component library |
| RxJS | 7.x | Reactive data streams |

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
  "amount": 50.00,
  "currency": "MYR",
  "region": "MY",
  "customerEmail": "user@example.com",
  "description": "Order #001",
  "redirectUrl": "https://merchant.com/payment/result",
  "metadata": { "itemCount": "3" }
}
```

**Initiate Payment Response:**
```json
{
  "transactionId": "txn_uuid",
  "status": "PENDING",
  "provider": "BILLPLZ",
  "routingReason": "Rule #2 matched: MY region, amount < RM100",
  "redirectUrl": "https://billplz.com/bills/abc123",
  "fee": 0.30,
  "createdAt": "2026-03-30T10:00:00Z"
}
```

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
| GET | `/admin/transactions` | Filter: status, provider, region, currency, dateFrom, dateTo, page, size |
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

### Demo Quality Goals
- ✅ Failover demo is reproducible on demand (Mock provider toggle)
- ✅ Transaction event timeline shows every step with timestamp and routing reason
- ✅ Dashboard loads with realistic seeded data (100+ transactions across all 3 regions)
- ✅ Cost savings card shows dollar/ringgit/peso figures, not percentages alone

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

### Phase 4 — Angular Admin Dashboard (Weeks 7–8)
**Goal:** Full system demonstrable through browser.

- ✅ Project scaffold: standalone components, JWT interceptor, auth guard
- ✅ Login page + token storage
- ✅ Layout shell: sidebar + topbar with active user display
- ✅ Dashboard: KPI cards + ngx-charts volume chart + provider breakdown
- ✅ Transaction list: filterable, paginated, status badges, CSV export
- ✅ Transaction detail: event timeline component
- ✅ Routing rules: CRUD table + create/edit modal + simulate panel
- ✅ Providers: health status, toggle, fee config edit
- ✅ Payment demo: form to trigger test payments, shows routing decision result in real time

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

- **Multi-tenant support** — multiple merchant accounts with isolated routing rules
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
| Flyway Migration | Table | Module |
|---|---|---|
| V1 | users | pos-domain |
| V2 | transactions | pos-domain |
| V3 | transaction_events | pos-domain |
| V4 | provider_configs | pos-domain |
| V5 | routing_rules | pos-domain |
| V6 | provider_metrics | pos-domain |
| V7 | webhook_logs | pos-domain |
| V8 | idempotency_records | pos-domain |
| V9 | audit_logs | pos-domain |

### RabbitMQ Queue Topology (Implementation Reference)
```yaml
# Docker Compose
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"    # AMQP
    - "15672:15672"  # Management UI (guest/guest in dev)

# Exchanges declared on startup (RabbitMQ Config Bean)
webhook.exchange    → direct → webhook.queue
                                 DLX: webhook.dlx → webhook.dlq

retry.exchange      → direct → retry.q.30s  (x-message-ttl: 30000,  DLX: retry.exchange)
                             → retry.q.60s  (x-message-ttl: 60000,  DLX: retry.exchange)
                             → retry.q.120s (x-message-ttl: 120000, DLX: retry.exchange)
                             → payment.dlq  (terminal — after 3 attempts)
```

### What Makes This Defensible in a Viva
1. **"Why not just use Xendit?"** — Xendit is one of our providers. We route *to* Xendit (or its equivalent). The orchestration layer is what selects *which* provider, when to fail over, and how to optimize cost. Xendit doesn't solve that problem — it is one variable in the solution.
2. **"Is this a real problem?"** — Yes. Grab, Gojek, Shopee, and Lazada all operate internal payment orchestration layers for exactly this reason. This project is a demonstrable, smaller-scale implementation of the same pattern.
3. **"What's novel about your routing algorithm?"** — The composite scorer with tunable weights, region-aware rule engine, and real-time success rate feedback loop. Show the simulate endpoint's breakdown table.
4. **"Why RabbitMQ and not Kafka?"** — RabbitMQ is purpose-built for task queues with routing, TTL, and dead letter patterns. Kafka is a distributed log designed for event streaming at millions of events/second — using it here would be like using a freight train to deliver a letter. RabbitMQ's dead letter exchange gives us native exponential backoff with zero custom scheduling code.
5. **"What happens when a payment gets stuck?"** — Show the DLQ panel. Walk through: provider failure → 3 retry attempts with increasing delays → RETRY_EXHAUSTED status → admin sees it → clicks Re-queue after provider recovers → payment completes. This is a production-grade failure recovery flow.
