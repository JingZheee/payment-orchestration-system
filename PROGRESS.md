# Progress Snapshot
Last updated: 2026-04-03

## Completed
- [x] PRD.md finalised (v1.1)
- [x] Decided on Maven (not Gradle) for build tool
- [x] CLAUDE.md created with full project context
- [x] docker-compose.yml (PostgreSQL 15 + RabbitMQ 3-management)
- [x] .gitignore (excludes *-dev.yml, *-prod.yml, node_modules)
- [x] Parent pom.xml with Spring Boot BOM, Java 21, all 7 modules declared
- [x] pos-common/pom.xml — pure Java, no Spring
- [x] pos-domain/pom.xml — JPA + Flyway + PostgreSQL
- [x] pos-provider/pom.xml — Spring Web + WebFlux
- [x] pos-routing/pom.xml — Spring core
- [x] pos-payment/pom.xml — Spring Web + AMQP + Testcontainers
- [x] pos-admin/pom.xml — Spring Web + AMQP
- [x] pos-api/pom.xml — runnable app, Security + JWT + Swagger
- [x] application.yml (routing weights, queue names, JWT expiry)
- [x] application-dev.yml template (gitignored, sandbox key stubs)
- [x] PaymentOrchestrationApplication.java entry point

## Up next (start here next session)
- [ ] Verify prerequisites: `java -version` (21), `mvn -version` (3.9+), `docker -v`, `ng version` (17)
- [ ] `docker compose up -d` → confirm RabbitMQ UI at :15672 and Postgres on 5432
- [ ] `mvn clean install -f payment-orchestration-backend/pom.xml` — confirm multi-module build compiles
- [ ] Phase 1 — pos-common: PaymentStatus, Region, Currency, Provider enums + ApiResponse<T> DTO + base exceptions
- [ ] Phase 1 — pos-domain: JPA entities (Transaction, TransactionEvent, User, ProviderConfig, RoutingRule, ProviderMetrics, WebhookLog, IdempotencyRecord, AuditLog) + Flyway migrations V1–V9
- [ ] Phase 1 — pos-api: Spring Security + JWT (login → access token + refresh token)
- [ ] Phase 1 — pos-provider: PaymentProviderPort interface + Mock provider implementation
- [ ] Register Billplz / Midtrans / PayMongo sandboxes, fill in application-dev.yml

## Decisions locked in
- Maven multi-module (not Gradle) — lower learning curve, Spring Boot default, PRD specifies it
- Hexagonal architecture — PaymentProviderPort is the core contract, adapters never leak into domain
- RabbitMQ (not Kafka) — purpose-built for task queues/DLQ/TTL; Kafka is over-engineered at this scale
- No DB mocking in tests — Testcontainers with real PostgreSQL only (Flyway migration safety)
- spring-boot-maven-plugin only in pos-api — other modules are plain JARs
- application-dev.yml and application-prod.yml are gitignored — secrets never committed

## Blockers
- None
