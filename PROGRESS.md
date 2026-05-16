# Progress Snapshot
Last updated: 2026-05-16

## Completed
- [x] PRD.md v1.2 — notification queue, demo policies, US-13–16, new API endpoints, V21 DB map, viva points 7–8
- [x] PRD.md v1.1 — insurance domain, US-10/11/12, frontend pivoted to React, all migrations up to V20
- [x] CLAUDE.md — full migration table V1–V21, RabbitMQ topology, React frontend stack, active session
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V21
- [x] All backend modules — entities, repos, adapters, routing engine, payment service, admin, DLQ/retry consumers
- [x] Spring Security + JWT (JwtAuthenticationFilter, JwtTokenProvider); CORS, 401/403 fix
- [x] V17–V20 migrations — policy_number, claim_reference, payment_type, payment_methods table
- [x] DB-driven payment methods — PaymentMethodEntity, composite PK; PaymentMethod enum deleted everywhere
- [x] All 4 provider adapters updated — supportedMethods() and calculateFee use plain String
- [x] AdminPaymentMethodController — GET/POST/PUT/DELETE with 409 guard
- [x] React + Vite frontend — all 10 pages, service layer, TanStack Query hooks, AppLayout
- [x] Login, RequireAuth guard, JWT Axios interceptor; Dashboard, Transactions, Routing Rules pages
- [x] Providers, Fee Rates, Metrics, Reconciliation, Dead Letter Queue pages
- [x] PaymentMethods admin page — table grouped by region, add/edit modal, active toggle, delete
- [x] PaymentSucceededEvent DTO + PaymentSucceededPublisher (pos-payment)
- [x] NotificationConsumer — id="notificationConsumer", writes PREMIUM_ACTIVATED / CLAIM_DISBURSED events, activates demo policies
- [x] NotificationQueueController — GET /status, POST /consumer/start, POST /consumer/stop
- [x] RabbitMqConfig updated — notification.exchange + payment.notification.queue beans; RabbitAdmin bean
- [x] application.yml — rabbitmq.exchanges.notification + rabbitmq.queues.notification added
- [x] PaymentService — publishes PaymentSucceededEvent on direct SUCCESS (Mock path)
- [x] PaymentService.handleWebhook — publishes with previous != SUCCESS guard
- [x] RetryConsumer — publishes PaymentSucceededEvent on retry-resolved SUCCESS
- [x] V21 migration — demo_policies table with 6 seed rows (4 premium MY/ID/PH, 2 claims MY/PH)
- [x] DemoPolicy entity, DemoPolicyRepository (findByPolicyNumber, findByClaimReference)
- [x] DemoPolicyController — GET/POST/DELETE /admin/demo-policies
- [x] Frontend: notificationQueueService, useNotificationQueue hooks
- [x] NotificationQueuePanel — live queue depth counter + consumer on/off switch (on Providers page)
- [x] demoPolicyService, useDemoPolicies hooks (refetchInterval: 4000)
- [x] PaymentDemo.tsx — full rewrite: policy/claim table, Pay button, pre-filled form, gateway redirect, duplicate prevention via submittedIds + optimistic cache update
- [x] endpoints.ts — DEMO_POLICIES + NOTIFICATION_QUEUE routes added

## Up next (start here next session)
- [ ] End-to-end smoke test — login → initiate MY/ID/PH payment via demo policy table → verify routing decision, event timeline, PREMIUM_ACTIVATED event, policy row turns green
- [ ] Notification queue durability demo — stop consumer → initiate 5 payments → watch depth climb → start → drain to 0
- [ ] Demo data seeding — ensure 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run through 10-minute demo script end-to-end, note rough edges

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
- notification.exchange is durable direct exchange; payment.notification.queue has no TTL/DLX — messages persist

## Blockers
- None
