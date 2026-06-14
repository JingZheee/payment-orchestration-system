# Progress Snapshot
Last updated: 2026-06-14

## Completed
- [x] PRD.md v2.0 — all features documented including reconciliation import
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V27, all entities/repos/adapters
- [x] Spring Security + JWT; CORS, 401/403 fix
- [x] DB-driven payment methods — PaymentMethodEntity, composite PK; enum deleted everywhere
- [x] AdminPaymentMethodController — GET/POST/PUT/DELETE with soft-delete
- [x] React + Vite frontend — all pages, service layer, TanStack Query hooks, AppLayout
- [x] Login, RequireAuth, JWT Axios interceptor; all admin pages wired
- [x] PaymentSucceededEvent + NotificationConsumer (PREMIUM_ACTIVATED / CLAIM_DISBURSED events)
- [x] NotificationQueueController + NotificationQueuePanel (live depth counter + on/off switch)
- [x] V21 migration — demo_policies + 6 seed rows; DemoPolicy entity, repo, controller
- [x] PaymentDemo — policy/claim table with Pay/Disburse buttons + gateway redirect
- [x] RoutingRules page — region tabs, dnd-kit drag-to-reorder, priority auto-reassigned
- [x] Email notification on payment success — branded HTML, Mailtrap SMTP, non-fatal
- [x] Email notification on RETRY_EXHAUSTED — failure HTML email from DlqConsumer
- [x] Duplicate payment prevention — backend 409 guard, atomically updates policy status
- [x] Xendit adapter — Invoice API (collection) + Disbursements API (claims)
- [x] Async webhook refactor — WebhookController fast-ack, WebhookConsumer, RetryConsumer
- [x] Dead Letter Queue page — requeue endpoint + full frontend
- [x] Midtrans adapter fixes — CARD→Snap API, vaNumber surfaced, providerTransactionId fix
- [x] User Management module — UserAdminController + Users frontend page
- [x] InsureStore — V24+V25 migrations; 15 seeded products (MY/ID/PH); multi-region support
- [x] InsureStore — quote-based flow: POST /store/quote saves QUOTE, emails payment link
- [x] InsureStore — CompletePaymentPage: two-panel layout, branded method icons, VA inline display
- [x] InsureStore — PaymentResultPage; POST /store/pay idempotent (PENDING→existing URL, FAILED→retry)
- [x] Midtrans VA bank selection — BankPicker (BCA/BNI/BRI/CIMB) in InsureStore + PaymentDemo
- [x] Failure email — "Retry Payment →" button; success email — "View Policy Status →" button
- [x] Customer policy status dashboard — PolicyLookupPage + PolicyStatusPage (3-card layout)
- [x] Policy status backend — GET /store/policy/lookup + GET /store/policy/{policyId} (public)
- [x] Reconciliation import — ReconImportService (Apache POI), POST /import, GET /template, GET /summary
- [x] Reconciliation template — pre-filled XLSX from unreconciled transactions, actual_fee blank
- [x] Reconciliation anomaly detection — auto-flag when |variance_pct| > 5% (configurable)
- [x] Reconciliation KPI strip — real aggregate totals from /summary, not current-page counts
- [x] Import result modal — rowsNoFee vs rowsUnmatched distinguished; improved logging
- [x] Fix latency metric — V27 adds provider_latency_ms to transactions; PaymentService times the provider.initiatePayment() call; MetricsAggregator reads this column instead of updatedAt - createdAt
- [x] Fix success rate metric — MetricsAggregator now computes over terminal states only (SUCCESS + FAILED + RETRY_EXHAUSTED), excluding in-flight PENDING/PROCESSING from the denominator
- [x] PRD updated — correct weights (40/25/15/20), expanded formula definitions, V26+V27 in migration table

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
- Frontend: React 18 + Vite + antd v5, feature-based structure
- Quote-based checkout: form creates QUOTE record + email; payment only on email link click
- POST /store/pay is idempotent for PENDING (returns existing URL, no new transaction)
- Policy status page uses UUID as implicit access token — no login required
- Reconciliation uses transactions.fee as expected_fee — immune to fee rate changes
- Latency = provider API call duration only (provider_latency_ms column); user think time excluded
- Success rate = terminal transactions only; PENDING/PROCESSING excluded from denominator

## Blockers
- Reconciliation import returning matched=0 when actual_fee column is blank — improved logging added; need to fill column and re-test
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
