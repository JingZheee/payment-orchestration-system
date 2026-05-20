# Progress Snapshot
Last updated: 2026-05-20

## Completed
- [x] PRD.md v1.2 — notification queue, demo policies, US-13–16, new API endpoints, V21 DB map, viva points 7–8
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V21, all entities/repos/adapters
- [x] Spring Security + JWT; CORS, 401/403 fix
- [x] DB-driven payment methods — PaymentMethodEntity, composite PK; enum deleted everywhere
- [x] AdminPaymentMethodController — GET/POST/PUT/DELETE with 409 guard
- [x] React + Vite frontend — all 10 pages, service layer, TanStack Query hooks, AppLayout
- [x] Login, RequireAuth, JWT Axios interceptor; Dashboard, Transactions, Routing Rules pages
- [x] Providers, Fee Rates, Metrics, Reconciliation, Dead Letter Queue, PaymentMethods pages
- [x] PaymentSucceededEvent + NotificationConsumer (PREMIUM_ACTIVATED / CLAIM_DISBURSED events)
- [x] NotificationQueueController + NotificationQueuePanel (live depth counter + on/off switch)
- [x] V21 migration — demo_policies table with 6 seed rows
- [x] DemoPolicy entity, repo, controller; demoPolicyService + useDemoPolicies hooks
- [x] PaymentDemo — policy/claim queue table with Pay/Disburse buttons
- [x] PaymentCheckoutPage — full-page gateway UX outside AppLayout (dark summary + form)
- [x] Duplicate payment fully blocked — checkout page has no resubmit path; backend IdempotencyFilter guards API
- [x] RoutingRules page — region tabs (MY/ID/PH/Global), dnd-kit drag-to-reorder, priority auto-reassigned, parallel PUT on drop, priority removed from modal

## Up next (start here next session)
- [ ] End-to-end smoke test — login → click Pay → verify checkout page, routing decision, event timeline, PREMIUM_ACTIVATED, policy row turns green
- [ ] Notification queue durability demo — stop consumer → initiate 5 payments → watch depth climb → start → drain to 0
- [ ] Demo data seeding — ensure 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run through 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); webhook failure → return 200 to prevent retry storms
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v5, feature-based structure
- API paths centralised in lib/endpoints.ts — never hardcode in hooks
- Payment checkout is a separate full-page route outside AppLayout
- Routing rules: drag-to-reorder (dnd-kit); priority is per-region, not global; no priority field in modal

## Blockers
- None
