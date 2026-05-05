# Progress Snapshot
Last updated: 2026-05-05

## Completed
- [x] PRD.md finalised — insurance domain, US-10/11/12, frontend pivoted to React, all migrations up to V20
- [x] CLAUDE.md — full migration table V1–V20, PaymentProviderPort contract, React frontend stack, active session
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V20
- [x] All backend modules — entities, repos, adapters, routing engine, payment service, admin, DLQ/retry consumers
- [x] Spring Security + JWT (JwtAuthenticationFilter, JwtTokenProvider)
- [x] CORS config, 401 vs 403 fix, GET /admin/transactions/{id} endpoint
- [x] V17 migration — policy_number, claim_reference, payment_type on transactions
- [x] V18 migration — payment_type column on routing_rules
- [x] V19 migration — seed insurance-specific routing rules
- [x] V20 migration — payment_methods table (composite PK code+region), 13 seed rows, composite FK
- [x] DB-driven payment methods — PaymentMethodEntity, PaymentMethodId, PaymentMethodRepository
- [x] PaymentMethod Java enum deleted — all fields/params use plain String throughout
- [x] All 4 provider adapters updated — supportedMethods() returns List<String>, calculateFee takes String
- [x] AdminPaymentMethodController — GET/POST/PUT/DELETE with 409 guard on FK violation
- [x] React + Vite frontend — all 10 pages, service layer, TanStack Query hooks, AppLayout
- [x] Login page, RequireAuth guard, JWT Axios interceptor
- [x] Dashboard, Transactions, Routing Rules, Providers, Fee Rates pages
- [x] Metrics, Reconciliation, Dead Letter Queue, Payment Demo pages
- [x] PaymentMethods admin page — table grouped by region, add/edit modal, active toggle, delete with confirm
- [x] Frontend types updated — PaymentMethod enum removed, replaced with PAYMENT_METHOD_LABELS const map
- [x] endpoints.ts — PAYMENT_METHODS routes added; App.tsx + AppLayout.tsx wired

## Up next (start here next session)
- [ ] End-to-end smoke test — login → initiate MY/ID/PH payment → verify routing decision, event timeline, recon record
- [ ] Demo data seeding — ensure 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Payment Demo page polish — confirm routing explanation displays score breakdown clearly
- [ ] Viva prep — run through 10-minute demo script end-to-end, note any rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); webhook failure → return 200 to prevent retry storms
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Fee rates region-scoped: unique key (provider, region, payment_method)
- Routing rules: preferredProvider XOR strategy — not both
- Frontend: React 18 + Vite + antd v5, feature-based structure
- API paths centralised in lib/endpoints.ts — never hardcode in hooks
- Session expiry → 401; axios interceptor redirects to /login on 401

## Blockers
- None
