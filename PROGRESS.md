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
- [x] pos-domain: Flyway migrations V1–V14 (V10=fee rates, V11=recon, V12=fee accuracy metric, V13=routing rule strategy, V14=dummy data + demo rules)
- [x] pos-domain: V15 — added `region` to provider_fee_rates; unique key now (provider, region, payment_method)
- [x] pos-domain: V16 — added `region` to recon_statements; single-region providers backfilled, MOCK rows NULL
- [x] pos-provider: PaymentProviderPort.calculateFee() now takes (amount, region, paymentMethod)
- [x] pos-provider: All 4 adapters updated — calculateFee passes region; single-region adapters hardcode their region, MOCK uses passed region
- [x] pos-routing: ProviderScorer volumeWeightedFee now region-scoped (countByPaymentMethodForProviderAndRegion)
- [x] pos-routing: LowestFeeStrategy passes region to calculateFee
- [x] pos-payment: PaymentMethodController passes region to calculateFee
- [x] All unit tests passing — BUILD SUCCESS
- [x] ROUTING.md created — full routing strategy, fee rates, and payment method selection docs

## Up next (start here next session)
- [ ] Frontend admin pages: /admin/fee-rates (table + inline edit, region column now visible)
- [ ] Frontend routing rules page: add strategy dropdown column (LOWEST_FEE / SUCCESS_RATE / —)
- [ ] Frontend: /admin/recon (recon statements list + anomaly filter)
- [ ] Test end-to-end: initiate MY payment → verify BILLPLZ vs MOCK scoring uses region-scoped fee
- [ ] Verify recon anomaly record is flagged (MIDTRANS/GOPAY 10% variance in seed data)

## Decisions locked in
- Maven multi-module (not Gradle)
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka)
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- spring-boot-maven-plugin only in pos-api
- Secrets gitignored (application-dev.yml, application-prod.yml)
- Fee rates stored in DB (provider_fee_rates) — not hardcoded in adapters
- Fee rates are region-scoped: unique key is (provider, region, payment_method) — do not revert to (provider, payment_method)
- ProviderConfig PK stays as provider only (no region) — availability is provider-level, not region-level
- calculateFee always receives region explicitly — adapters hardcode their region, MOCK uses the passed value
- Volume-weighted fee scoring: method distribution from recon history, scoped to region
- Routing rules: preferredProvider XOR strategy — not both

## Blockers
- None
