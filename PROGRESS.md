# Progress Snapshot
Last updated: 2026-04-14

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
- [x] pos-provider: 6 provider DTOs + PaymentProviderPort interface
- [x] pos-provider: All 4 adapters — calculateFee() now reads from ProviderFeeRateRepository (not hardcoded)
- [x] pos-provider: MOCK now covers MY, ID, PH (was ID, PH only)
- [x] pos-routing: RegionBasedStrategy, SuccessRateStrategy, LowestFeeStrategy (now wired into engine)
- [x] pos-routing: ProviderScorer — volume-weighted fee (from recon history) + fee accuracy as 4th score component (sr 40%, fee 25%, latency 15%, accuracy 20%)
- [x] pos-routing: RoutingEngine — per-rule strategy delegation (rule can have preferredProvider OR strategy)
- [x] pos-payment: PaymentService, IdempotencyFilter, RetryPublisher, PaymentController, WebhookController
- [x] pos-api: Security, Auth, RabbitMqConfig (Jackson2JsonMessageConverter — fixes AMQP serialisation error)
- [x] pos-admin: MetricsAggregator now computes feeAccuracyRate; RoutingRuleService supports strategy field
- [x] pos-admin: ProviderFeeRateController (GET list, PUT update) + ReconStatementController (list + anomalies)
- [x] Angular frontend scaffolded: login, demo payment page, transaction detail, payment result pages
- [x] Frontend: AuthService, JwtInterceptor, AuthGuard, ApiService, PaymentService, core models
- [x] Billplz redirect_url fix (uses request.getRedirectUrl(), not hardcoded)
- [x] All unit tests passing — BUILD SUCCESS

## Up next (start here next session)
- [ ] Frontend admin pages: /admin/fee-rates (table + inline edit), /admin/recon (list + anomaly filter)
- [ ] Frontend routing rules page: add strategy dropdown column (LOWEST_FEE / SUCCESS_RATE / —)
- [ ] Test end-to-end: initiate MY payment → verify BILLPLZ vs MOCK scoring uses volume-weighted fee
- [ ] Test routing rule: create strategy=LOWEST_FEE rule for MY → verify it fires
- [ ] Verify recon anomaly record is flagged (MIDTRANS/GOPAY 10% variance in seed data)
- [ ] Stage 2: CSV statement upload → auto-populate recon_statements

## Decisions locked in
- Maven multi-module (not Gradle)
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka)
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- spring-boot-maven-plugin only in pos-api
- Secrets gitignored (application-dev.yml, application-prod.yml)
- Fee rates stored in DB (provider_fee_rates) — not hardcoded in adapters
- Reconciliation in separate table (recon_statements) — transactions table untouched
- Volume-weighted fee scoring: method distribution from recon history, not assumed at routing time
- Routing rules: preferredProvider XOR strategy — not both

## Blockers
- None
