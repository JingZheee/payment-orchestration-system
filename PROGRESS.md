# Progress Snapshot
Last updated: 2026-04-13

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
- [x] pos-domain: 9 JPA entities, 9 Spring Data repositories
- [x] pos-domain: Flyway migrations V1–V9 (all tables + indexes + provider_configs seed)
- [x] pos-provider: 6 provider DTOs + PaymentProviderPort interface (7-method contract)
- [x] pos-provider: MockProviderAdapter — all 4 modes, runtime toggle
- [x] pos-provider: BillplzAdapter, MidtransAdapter, PayMongoAdapter
- [x] pos-routing: RegionBasedStrategy, SuccessRateStrategy, LowestFeeStrategy
- [x] pos-routing: ProviderScorer (success_rate 50% + fee 30% + latency 20%)
- [x] pos-routing: RoutingEngine (rule match first, scorer fallback) + 16 unit tests — BUILD SUCCESS
- [x] pos-payment: PaymentService, IdempotencyFilter, RetryPublisher
- [x] pos-payment: PaymentController + WebhookController
- [x] pos-api: JwtTokenProvider, JwtAuthenticationFilter, UserDetailsServiceImpl
- [x] pos-api: SecurityConfig, RabbitMqConfig, GlobalExceptionHandler, OpenApiConfig
- [x] pos-api: AuthController (POST /auth/login, /auth/refresh, /auth/register)
- [x] pos-api: RegisterRequest DTO added; /register returns tokens on success
- [x] pos-admin: RoutingRuleService, MetricsAggregator, AdminController, DlqConsumer
- [x] Fixed compile error: MockProviderAdapter.calculateFee called with wrong arg count

## Up next (start here next session)
- [ ] Angular frontend scaffold (ng new, Angular Material, proxy config)
- [ ] Core: AuthService, ApiService, JwtInterceptor, AuthGuard
- [ ] App shell: MatSidenav layout + routing
- [ ] Pages: Login, Dashboard (ngx-charts), Transactions, Transaction Detail
- [ ] Pages: Routing Rules (CRUD dialog), Providers (toggle cards), Demo (live payment)

## Decisions locked in
- Maven multi-module (not Gradle) — lower learning curve, Spring Boot default, PRD specifies it
- Hexagonal architecture — PaymentProviderPort is the core contract, adapters never leak into domain
- RabbitMQ (not Kafka) — purpose-built for task queues/DLQ/TTL; Kafka is over-engineered at this scale
- No DB mocking in tests — Testcontainers with real PostgreSQL only (Flyway migration safety)
- spring-boot-maven-plugin only in pos-api — other modules are plain JARs
- application-dev.yml and application-prod.yml are gitignored — secrets never committed

## Blockers
- None
