# Progress Snapshot
Last updated: 2026-04-15

## Completed
- [x] PRD.md finalised (v1.1)
- [x] Decided on Maven (not Gradle) for build tool
- [x] CLAUDE.md created with full project context
- [x] docker-compose.yml (PostgreSQL 15 + RabbitMQ 3-management)
- [x] .gitignore (excludes *-dev.yml, *-prod.yml, node_modules)
- [x] Parent pom.xml + all 7 module pom.xml files (Java 21, Spring Boot 3.2.5)
- [x] application.yml (routing weights, queue names, JWT expiry)
- [x] application-dev.yml template (gitignored, sandbox key stubs)
- [x] PaymentOrchestrationApplication.java entry point
- [x] pos-common: 8 enums + FeeType enum added
- [x] pos-common: ApiResponse<T> DTO + PosException base + 5 typed exceptions
- [x] pos-domain: 9 JPA entities + 2 new (ProviderFeeRate, ReconStatement), 11 repositories
- [x] pos-domain: Flyway migrations V1–V16 (V15=region to fee rates, V16=region to recon)
- [x] pos-provider: PaymentProviderPort.calculateFee() takes (amount, region, paymentMethod)
- [x] pos-provider: All 4 adapters updated — region-scoped fee lookup
- [x] pos-routing: ProviderScorer volumeWeightedFee region-scoped
- [x] pos-routing: LowestFeeStrategy passes region to calculateFee
- [x] pos-payment: IdempotencyFilter (SHA-256 body hash, DB-backed, 24h TTL)
- [x] pos-payment: PaymentService + RetryPublisher (TTL queue scheduling)
- [x] pos-payment: WebhookController (HMAC/RSA signature verify, returns 200 on bad sig)
- [x] pos-admin: DlqConsumer (marks RETRY_EXHAUSTED after attempt 4+)
- [x] pos-admin: RetryConsumer — NEW: @RabbitListener on webhook.queue, polls queryPaymentStatus(), resolves or re-publishes
- [x] pos-admin/pom.xml: added pos-provider dependency for RetryConsumer
- [x] ROUTING.md — full routing strategy, fee rates, region-scoped docs
- [x] IDEMPOTENCY_RETRY.md — full idempotency + retry mechanism docs
- [x] Postman collection (postman/POS.postman_collection.json) — all endpoints
- [x] All unit tests passing — BUILD SUCCESS

## Up next (start here next session)
- [ ] Frontend admin pages: /admin/fee-rates (inline-editable table with region column)
- [ ] Frontend routing rules page: add strategy dropdown column (LOWEST_FEE / SUCCESS_RATE / —)
- [ ] Frontend: /admin/recon (recon statements list + anomaly filter)
- [ ] End-to-end test: initiate MY payment → verify BILLPLZ vs MOCK scoring uses region-scoped fee
- [ ] End-to-end test: verify recon anomaly record flagged (MIDTRANS/GOPAY 10% variance in seed data)

## Decisions locked in
- Maven multi-module (not Gradle)
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka)
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- spring-boot-maven-plugin only in pos-api
- Secrets gitignored (application-dev.yml, application-prod.yml)
- Fee rates region-scoped: unique key (provider, region, payment_method) — do not revert
- calculateFee always receives region explicitly
- Volume-weighted fee scoring scoped to region
- Routing rules: preferredProvider XOR strategy — not both
- Webhook signature failure → return HTTP 200 (prevent provider retry storms), rely on RetryConsumer to poll actual status
- RetryConsumer poll failure treated as still-pending (safe fallback, not FAILED)

## Blockers
- None
