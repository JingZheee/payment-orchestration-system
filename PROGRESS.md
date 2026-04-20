# Progress Snapshot
Last updated: 2026-04-20

## Completed
- [x] PRD.md finalised (v1.1) — insurance domain context, US-10/11/12, V17 migration entry
- [x] CLAUDE.md updated — insurance overview, full DB migration table V1–V17, React frontend stack
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V16
- [x] All backend modules — entities, repos, adapters, routing, payment, admin, DLQ/retry consumers
- [x] Spring Security + JWT (JwtAuthenticationFilter, JwtTokenProvider)
- [x] CORS config added (CorsConfig.java — allows localhost:5173)
- [x] 401 vs 403 fixed — SecurityConfig AuthenticationEntryPoint (expired token → 401 not 403)
- [x] GET /admin/transactions/{id} endpoint added (transaction + event timeline)
- [x] React + Vite frontend scaffolded — feature-based structure, antd v6, TanStack Query v5
- [x] Shared types — all enums, ApiResponse, Page, Transaction, Dashboard, Routing, Provider, FeeRate, Metrics, Recon, Auth
- [x] AppLayout — fixed sidebar (InsureRoute brand, NavLink active states), sticky topbar, logout dropdown
- [x] Login page — JWT form, redirects back to intended page after auth
- [x] RequireAuth guard — protects all admin routes, redirects to /login on missing token
- [x] lib/axios.ts — JWT interceptor, 401 → clear storage + redirect to /login
- [x] lib/endpoints.ts — centralised API path constants
- [x] Service layer — authService, dashboardService, transactionService, routingRuleService, providerService, feeRateService, metricsService, reconService
- [x] Dashboard page — 4 KPI cards, status donut, volume bar chart, routing intelligence panel
- [x] Transactions page — paginated table, filters, slide-in drawer with event timeline
- [x] Routing Rules page — full CRUD table, create/edit modal (provider XOR strategy)
- [x] Providers page — card grid, enable/disable toggle per provider
- [x] Fee Rates page — table, inline edit modal (fixed + percentage)
- [x] Metrics page — time window selector, summary cards, bar + radar charts, detail table
- [x] Reconciliation page — all statements + anomalies-only tab, variance colour coding

## Up next (start here next session)
- [ ] Dead Letter Queue page (/dead-letter-queue) — list DLQ messages, retry/discard actions
- [ ] Payment Demo page (/payment-demo) — trigger test payments, show live routing decision
- [ ] V17 Flyway migration — add policy_number, claim_reference, payment_type to transactions
- [ ] Wire policy/claim fields into PaymentService + transaction detail drawer
- [ ] End-to-end smoke test — login → initiate MY payment → verify routing + recon record

## Decisions locked in
- Maven multi-module (not Gradle); spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); webhook failure → return 200 to prevent retry storms
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Fee rates region-scoped: unique key (provider, region, payment_method)
- Routing rules: preferredProvider XOR strategy — not both
- Frontend: React + Vite + antd v6, feature-based (features/*/services/ + hooks/)
- All API calls go through service files; hooks are thin TanStack Query wrappers
- API paths centralised in lib/endpoints.ts — never hardcode in hooks
- Session expiry → 401 (not 403); axios interceptor redirects to /login on 401

## Blockers
- None
