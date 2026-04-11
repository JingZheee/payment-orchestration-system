# Payment Orchestration System — Claude Code Context

## Project Overview

Final Year Project (FYP). A Spring Boot 3 backend that intelligently routes payment transactions across multiple Southeast Asian payment providers (Malaysia, Indonesia, Philippines). The system acts as an orchestration layer — selecting the best provider per transaction based on region, composite scoring (success rate, fee, latency), and configurable routing rules.

**Demo goal:** A 10-minute examiner demo showing intelligent routing, live failover, and cost comparison — without explaining what "payment orchestration" means.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Java | 21 |
| Framework | Spring Boot | 3.x |
| Auth | Spring Security + JJWT | 6.x / 0.12+ |
| ORM | Spring Data JPA | 3.x |
| Message Broker | RabbitMQ + Spring AMQP | 3.x |
| Build | Maven (multi-module) | 3.9+ |
| Database | PostgreSQL | 15+ |
| Migrations | Flyway | 9.x |
| API Docs | Springdoc OpenAPI | 2.x |
| Boilerplate | Lombok + MapStruct | latest / 1.5+ |
| Testing | Testcontainers | 1.19+ |
| Frontend | Angular 17 (standalone) | 17 |
| UI Library | Angular Material | 17 |
| Charts | ngx-charts | latest |

---

## Maven Module Structure

```
payment-orchestration-backend/          ← parent POM (pom packaging, no code)
├── pos-common/                         ← enums, DTOs, exceptions, utils (no Spring deps)
├── pos-domain/                         ← JPA entities + Spring Data repositories + Flyway migrations
├── pos-provider/                       ← PaymentProviderPort interface + all 4 provider adapters
├── pos-routing/                        ← RoutingEngine, strategies (Region/SuccessRate/LowestFee), ProviderScorer
├── pos-payment/                        ← PaymentService, WebhookController, IdempotencyFilter, RetryPublisher
├── pos-admin/                          ← Admin controllers, RoutingRuleService, MetricsAggregator, DLQ consumer
└── pos-api/                            ← Main @SpringBootApplication, security config, filters — ONLY runnable module
```

**Dependency order (build bottom-up):**
```
pos-common
  └─ pos-domain
       ├─ pos-provider ─┐
       └─ pos-routing   ├─ pos-payment ─ pos-admin ─ pos-api
```

`spring-boot-maven-plugin` is declared ONLY in `pos-api`. Other modules are plain JARs.

---

## Key Architectural Patterns

- **Hexagonal (Port & Adapter):** `PaymentProviderPort` in `pos-provider` is the core contract. The routing engine and payment service never import provider SDKs directly. Adding a new provider = one new adapter class.
- **Strategy Pattern:** `RoutingStrategy` interface with `RegionBasedStrategy`, `SuccessRateStrategy`, `LowestFeeStrategy`.
- **Composite Scoring:** `ProviderScorer` assigns weighted scores: success_rate (50%) + fee (30%) + latency (20%).
- **Idempotency Filter:** Servlet filter intercepts requests with `Idempotency-Key` header before hitting the service layer. Checks `idempotency_records` table.
- **Immutable Event Log:** `transaction_events` table is append-only — no updates, only inserts.
- **Scheduled Metrics:** `MetricsAggregator` runs every 15 minutes to compute rolling success rates per provider per region.

---

## PaymentProviderPort Contract

Every provider implements:
```java
initiatePayment(request)                        // → redirect URL or direct result
queryPaymentStatus(transactionId)               // → current status
initiateRefund(request)                         // → refund result
verifyWebhookSignature(body, headers)           // → boolean (HMAC-SHA256 / RSA)
parseWebhookPayload(body)                       // → normalized WebhookParseResult
calculateFee(amount, currency)                  // → BigDecimal
isAvailable()                                   // → boolean (used by routing engine)
```

---

## Payment Providers

| Provider | Region | Methods | Webhook Verification |
|---|---|---|---|
| Billplz | MY (Malaysia) | FPX bank transfer | HMAC-SHA256 |
| Midtrans | ID (Indonesia) | Virtual Account, QRIS | HMAC-SHA256 |
| PayMongo | PH (Philippines) | Maya, cards, e-wallets | RSA signature |
| Mock | ALL | Configurable | Always passes |

**Mock provider modes:** `ALWAYS_SUCCESS`, `ALWAYS_FAIL`, `RANDOM`, `DELAYED` — toggleable via admin dashboard or `application-dev.yml`.

---

## Running Locally

### 1. Start infrastructure
```bash
docker compose up -d
```
- PostgreSQL 15 → `localhost:5432` (db: `pos_dev`, user: `pos`, pass: `pos`)
- RabbitMQ → `localhost:5672` (AMQP), `localhost:15672` (Management UI — guest/guest)

### 2. Start backend
```bash
cd payment-orchestration-backend
mvn spring-boot:run -pl pos-api -Dspring-boot.run.profiles=dev
```
Backend at `http://localhost:8080`. Swagger UI at `http://localhost:8080/swagger-ui.html`.

### 3. Start frontend
```bash
cd payment-orchestration-frontend
ng serve
```
Frontend at `http://localhost:4200`.

### 4. Expose webhooks (for sandbox providers)
```bash
ngrok http 8080
```
Use the generated HTTPS URL as the webhook base for Billplz/Midtrans/PayMongo sandboxes.

---

## Environment Config

- `application.yml` — non-sensitive config (routing weights, metrics interval, RabbitMQ exchange names). Committed to git.
- `application-dev.yml` — dev secrets (DB password, JWT secret, sandbox API keys). **GITIGNORED. Never commit.**
- `application-prod.yml` — prod secrets. **GITIGNORED. Never commit.**

```yaml
# application-dev.yml structure (fill in your sandbox keys)
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/pos_dev
    username: pos
    password: pos
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest

jwt:
  secret: <generate-256-bit-secret>
  access-token-expiry-ms: 900000       # 15 minutes
  refresh-token-expiry-ms: 604800000   # 7 days

providers:
  billplz:
    api-key: <sandbox-key>
    collection-id: <sandbox-collection>
    webhook-secret: <sandbox-secret>
  midtrans:
    server-key: <sandbox-server-key>
    client-key: <sandbox-client-key>
    webhook-secret: <sandbox-secret>
  paymongo:
    secret-key: <sandbox-secret-key>
    webhook-secret: <sandbox-webhook-secret>
  mock:
    default-mode: ALWAYS_SUCCESS
```

---

## API Conventions

- Base path: `/api/v1`
- All responses wrapped in `ApiResponse<T>`:
  ```json
  { "success": true, "data": { ... }, "message": null, "timestamp": "..." }
  { "success": false, "data": null, "message": "Error description", "timestamp": "..." }
  ```
- All admin endpoints require `ADMIN` or `VIEWER` role
- All payment endpoints require `MERCHANT` or `ADMIN` role
- Webhook endpoints (`/webhooks/**`) are public but HMAC-verified at application layer
- Idempotency required: `POST /payments/initiate` must include `Idempotency-Key: <uuid>` header

---

## Database (Flyway Migrations in `pos-domain`)

| Migration | Table | Key Columns |
|---|---|---|
| V1 | `users` | id, email, password_hash, role, refresh_token, token_expires_at |
| V2 | `transactions` | id, merchant_order_id, amount, currency, region, status, provider, routing_reason, fee, idempotency_key |
| V3 | `transaction_events` | id, transaction_id, event_type, description, created_at (append-only) |
| V4 | `provider_configs` | provider, is_enabled, fee_percentage, webhook_secret, updated_at |
| V5 | `routing_rules` | id, priority, region, currency, max_amount, min_amount, preferred_provider, is_enabled |
| V6 | `provider_metrics` | id, provider, region, success_rate, avg_latency_ms, transaction_count, window_start, window_end |
| V7 | `webhook_logs` | id, provider, transaction_id, raw_body, signature_valid, received_at, processed_at |
| V8 | `idempotency_records` | idempotency_key, request_hash, response_body, created_at, expires_at |
| V9 | `audit_logs` | id, admin_user, action, entity_type, entity_id, old_value, new_value, created_at |

---

## RabbitMQ Topology

```
webhook.exchange (direct)
  └─ webhook.queue
       └─ on failure → DLX → webhook.dlq

retry.exchange (direct)
  ├─ retry.q.30s   (x-message-ttl: 30000,  DLX back to retry.exchange)
  ├─ retry.q.60s   (x-message-ttl: 60000,  DLX back to retry.exchange)
  ├─ retry.q.120s  (x-message-ttl: 120000, DLX back to retry.exchange)
  └─ payment.dlq   (terminal — after 3 attempts, marks transaction RETRY_EXHAUSTED)
```

All exchanges and queues declared as `@Bean` in a `RabbitMqConfig` class in `pos-api` on startup.

---

## Testing Approach

- **Unit tests:** Pure domain logic (RoutingEngine, ProviderScorer, strategies) — no Spring context.
- **Integration tests:** `@SpringBootTest` + Testcontainers (real PostgreSQL, real RabbitMQ). **Do NOT mock the database.** We learned this the hard way — mock/prod divergence is a real risk for Flyway migrations.
- Test class naming: `*Test` for unit, `*IT` for integration.

---

## What NOT to Build (Out of Scope)

- Apache Kafka (RabbitMQ is the correct tool here — see PRD §6 for the defense)
- Mobile app
- Multi-tenant / multi-merchant support
- Real money transactions or PCI DSS compliance
- Card tokenization / vaulting
- Subscription / recurring billing
- CI/CD pipeline
- Cloud deployment (optional stretch goal only)
- Rate limiting or DDoS protection
- GCash, GrabPay, TNG eWallet direct APIs (no public sandbox exists)

---

## Routing Score Formula

```
score(provider) =
  (success_rate_last_1h × 0.50) +
  (1 - normalized_fee × 0.30) +
  (1 - normalized_latency × 0.20)

where:
  normalized_fee     = provider_fee / max_fee_among_eligible_providers
  normalized_latency = provider_avg_latency / max_latency_among_eligible_providers
```

Weights are configurable in `application.yml` under `routing.scorer.*`.

## References
- PRD.md — full specs, read ONLY when starting a new module or feature

---

## Active Session

| Field | Value |
|---|---|
| **Current module** | pos-provider / frontend |
| **Current task** | Billplz/Midtrans/PayMongo adapter stubs OR Angular frontend scaffold |
| **Last completed** | pos-admin: RoutingRuleService + MetricsAggregator + AdminController + DlqConsumer — BUILD SUCCESS |
| **Blockers** | None |
