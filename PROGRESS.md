# Progress Snapshot
Last updated: 2026-07-03

## Completed
- [x] VPS ops hardening — Mailpit UI exposed with MP_UI_AUTH basic auth (was SSH-tunnel-only)
- [x] RabbitMQ management UI (15672) published, gated by existing RABBITMQ_USER/PASS
- [x] Docker log rotation — x-logging anchor (json-file, 10m x 3) on all 5 prod services
- [x] Root-caused VPS disk pressure — uncapped Docker build cache/images on 9.7G disk, not app logs
- [x] deploy.yml fix — image prune `-f`→`-af` + added `docker builder prune -af` (cache was never cleaned)
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V27, all entities/repos/adapters
- [x] Spring Security + JWT; DB-driven payment methods (composite PK, enum removed)
- [x] React + Vite frontend — all pages, TanStack Query hooks, AppLayout, RBAC-aware nav
- [x] Notification pipeline — PaymentSucceededEvent/NotificationConsumer, queue panel, DLQ page+requeue
- [x] PaymentDemo page — policy/claim table, Pay/Disburse, branded success/failure/retry emails
- [x] RoutingRules page — region tabs, drag-to-reorder priority, paymentType wired end-to-end
- [x] Routing engine two-pass logic + /admin/dashboard/simulate decision panel
- [x] Providers — Billplz/Midtrans(Snap+VA)/PayMongo/Xendit(invoice+disbursement) adapters
- [x] Async webhook refactor — fast-ack controller, WebhookConsumer, RetryConsumer
- [x] InsureStore — 15 seeded products (MY/ID/PH), quote-based checkout, idempotent /store/pay
- [x] Public policy status dashboard — lookup + 3-card status page (UUID as implicit token)
- [x] Reconciliation — POI import/template/summary, anomaly flag at |variance_pct|>5%
- [x] Metrics fixes — provider_latency_ms column (V27); success rate over terminal states only
- [x] RBAC enforcement — SecurityConfig splits /api/v1/admin/** by HTTP method

## Up next (start here next session)
- [ ] End-to-end test reconciliation import: restart backend, download template, fill actual_fee column, upload, verify recon_statements rows saved and anomaly flagged
- [ ] Add Xendit sandbox keys to application-dev.yml, smoke test PH invoice + disbursement
- [ ] Smoke test policy status page: pay → success email → "View Policy Status →" → 3-card layout
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); active retry (30s→60s→120s→DLQ) is deliberate demo trade-off
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Quote-based checkout: form creates QUOTE record + email; payment only on email link click
- Reconciliation uses transactions.fee as expected_fee — immune to fee rate changes
- Latency = provider API call duration only; success rate excludes PENDING/PROCESSING
- Routing: region-specific rules always beat global rules regardless of priority number
- Prod VPS: Mailpit + RabbitMQ UI are public-but-credentialed (no SSH tunnel required)
- Deploy script must run both `docker image prune -af` and `docker builder prune -af` every deploy

## Blockers
- Reconciliation import returning matched=0 when actual_fee column is blank — improved logging added; need to fill column and re-test
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
