# Progress Snapshot
Last updated: 2026-04-11

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
- [x] Verified prerequisites: Java 21, Maven 3.9+, Docker
- [x] pos-common: 8 enums (PaymentStatus, Region, Currency, Provider, PaymentMethod, RoutingStrategy, MockProviderMode, UserRole)
- [x] pos-common: ApiResponse<T> DTO + PosException base + 5 typed exceptions
- [x] pos-domain: 9 JPA entities (User, Transaction, TransactionEvent, ProviderConfig, RoutingRule, ProviderMetrics, WebhookLog, IdempotencyRecord, AuditLog)
- [x] pos-domain: 9 Spring Data repositories
- [x] pos-domain: Flyway migrations V1–V9 (all tables + indexes + provider_configs seed)
- [x] pos-provider: 6 provider DTOs (PaymentRequest/Result, StatusResult, RefundRequest/Result, WebhookParseResult)
- [x] pos-provider: PaymentProviderPort interface (7-method contract)
- [x] pos-provider: MockProviderAdapter — all 4 modes (ALWAYS_SUCCESS/FAIL/RANDOM/DELAYED), runtime toggle
- [x] pos-routing: RoutingStrategy interface + RegionBasedStrategy, SuccessRateStrategy, LowestFeeStrategy
- [x] pos-routing: ProviderScorer (composite score: success_rate 50% + fee 30% + latency 20%)
- [x] pos-routing: RoutingEngine (rule match first, then scorer fallback) + RoutingDecision/RoutingContext DTOs
- [x] pos-routing: 16 unit tests (RoutingEngineTest, ProviderScorerTest, RegionBasedStrategyTest, LowestFeeStrategyTest) — BUILD SUCCESS
- [x] pos-payment: InitiatePaymentRequest/Response + RetryMessage DTOs
- [x] pos-payment: PaymentService (initiatePayment, handleWebhook, getTransaction) + TransactionEvent writer
- [x] pos-payment: IdempotencyFilter (SHA-256 hash, CachedBodyRequestWrapper, ContentCachingResponseWrapper)
- [x] pos-payment: RetryPublisher → retry.q.30s / 60s / 120s / payment.dlq based on attempt number
- [x] pos-payment: PaymentController (POST /initiate, GET /{id}) + WebhookController (POST /webhooks/{provider})
- [x] pos-domain: added TransactionRepository.findByProviderTransactionId()

- [x] pos-api: JwtTokenProvider (JJWT 0.12+: generate/validate/parse access tokens, UUID refresh tokens)
- [x] pos-api: JwtAuthenticationFilter (OncePerRequestFilter — Bearer header → SecurityContext)
- [x] pos-api: UserDetailsServiceImpl (loads User by email → Spring Security UserDetails)
- [x] pos-api: SecurityConfig (STATELESS, CSRF off, role rules: MERCHANT/ADMIN/VIEWER, JWT filter wired)
- [x] pos-api: RabbitMqConfig (webhook.exchange, retry.exchange, all 6 queues with TTL/DLX bindings)
- [x] pos-api: GlobalExceptionHandler (@RestControllerAdvice — PosException, validation, auth, 500)
- [x] pos-api: OpenApiConfig (bearerAuth SecurityScheme for Swagger Authorize button)
- [x] pos-api: AuthController (POST /auth/login + POST /auth/refresh) + LoginRequest/Response/RefreshRequest DTOs

- [x] pos-admin: RoutingRuleService (CRUD for routing_rules table)
- [x] pos-admin: MetricsAggregator (@Scheduled fixedRate=15min — aggregates success rate + latency by provider/region)
- [x] pos-admin: AdminController (GET /admin/metrics, GET|POST|PUT|DELETE /admin/routing-rules, GET /admin/transactions, GET|POST /admin/providers)
- [x] pos-admin: DlqConsumer (@RabbitListener on payment.dlq — marks transaction RETRY_EXHAUSTED, writes TransactionEvent)

## Up next (start here next session)
- [ ] pos-provider: Billplz adapter (FPX, HMAC-SHA256 webhook)
- [ ] pos-provider: Midtrans adapter (Virtual Account, QRIS, HMAC-SHA256 webhook)
- [ ] pos-provider: PayMongo adapter (Maya/cards/e-wallets, RSA webhook)
- [ ] Angular frontend scaffold (ng new, routing, Material, auth guard, dashboard)

## Decisions locked in
- Maven multi-module (not Gradle) — lower learning curve, Spring Boot default, PRD specifies it
- Hexagonal architecture — PaymentProviderPort is the core contract, adapters never leak into domain
- RabbitMQ (not Kafka) — purpose-built for task queues/DLQ/TTL; Kafka is over-engineered at this scale
- No DB mocking in tests — Testcontainers with real PostgreSQL only (Flyway migration safety)
- spring-boot-maven-plugin only in pos-api — other modules are plain JARs
- application-dev.yml and application-prod.yml are gitignored — secrets never committed
- pos-common depends on spring-boot-starter-web for HttpStatus in PosException

## Blockers
- None
