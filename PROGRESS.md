# Progress Snapshot
Last updated: 2026-05-26

## Completed
- [x] PRD.md v1.6 — all sessions documented; Midtrans adapter design notes added
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V23, all entities/repos/adapters
- [x] Spring Security + JWT; CORS, 401/403 fix
- [x] DB-driven payment methods — PaymentMethodEntity, composite PK; enum deleted everywhere
- [x] AdminPaymentMethodController — GET/POST/PUT/DELETE with soft-delete
- [x] React + Vite frontend — all 12 pages, service layer, TanStack Query hooks, AppLayout
- [x] Login, RequireAuth, JWT Axios interceptor; Dashboard, Transactions, Routing Rules pages
- [x] Providers, Fee Rates, Metrics, Reconciliation, PaymentMethods, RoutingEngine pages
- [x] PaymentSucceededEvent + NotificationConsumer (PREMIUM_ACTIVATED / CLAIM_DISBURSED events)
- [x] NotificationQueueController + NotificationQueuePanel (live depth counter + on/off switch)
- [x] V21 migration — demo_policies + 6 seed rows; DemoPolicy entity, repo, controller
- [x] PaymentDemo — policy/claim table with Pay/Disburse buttons + gateway redirect
- [x] RoutingRules page — region tabs, dnd-kit drag-to-reorder, priority auto-reassigned
- [x] Email notification on payment success — branded HTML, Mailtrap SMTP, non-fatal
- [x] Email notification on RETRY_EXHAUSTED — failure HTML email from DlqConsumer, looks up DemoPolicy
- [x] Duplicate payment prevention — backend 409 guard, atomically updates policy status
- [x] Xendit adapter — Invoice API (collection) + Disbursements API (claims); webhook verification
- [x] V22 migration — XENDIT in provider_configs + 5 PH fee rate rows; PAYMONGO disabled
- [x] Async webhook refactor — WebhookController fast-ack, WebhookConsumer, RetryConsumer on dedicated queue
- [x] Dead Letter Queue page — requeue endpoint + full frontend (table, InfoBanner, TransactionDetailDrawer)
- [x] Midtrans adapter fixes — CARD→Snap API, vaNumber surfaced, providerTransactionId=merchantOrderId
- [x] V23 migration — va_number column added to transactions
- [x] AppLayout sidebar — useless global search bar removed; duplicate "Admin" label removed
- [x] AppLayout sidebar — nav items grouped into 5 labelled sections (Overview/Routing/Configuration/Analytics/System)
- [x] User Management module — UserAdminController (GET/POST/PUT/DELETE), spring-security-crypto dep added
- [x] Users frontend page — table, create modal, change-role modal, delete with confirm; /users route + nav item
- [x] PRD updated — Feature 6 architectural rationale (active polling vs webhooks+reconciliation); viva Q8 added

## Up next (start here next session)
- [ ] Restart backend (picks up all code changes since last restart)
- [ ] Smoke test CARD payment — Midtrans Snap hosted page → simulate card → webhook → SUCCESS
- [ ] Smoke test VA payment — VA number in checkout UI; simulate BCA transfer in Midtrans sandbox
- [ ] Add Xendit sandbox keys to application-dev.yml, then smoke test PH invoice + disbursement
- [ ] Verify failure email — trigger RETRY_EXHAUSTED via Mock ALWAYS_FAIL → confirm Mailtrap receives it
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); active retry loop (30s→60s→120s→DLQ) is deliberate demo trade-off vs production hourly reconciliation job
- webhook.queue = inbound provider webhooks; retry.processing.queue = RetryConsumer; payment.dlq = RETRY_EXHAUSTED
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v5, feature-based structure
- Xendit: Invoice API for collection (redirect), Disbursements API for claims (direct payout, resolves synchronously in sandbox)
- Billplz + Midtrans are PREMIUM_COLLECTION only; MY/ID claims route to Mock
- Midtrans CARD → Snap API (hosted page); all other methods → Core API; providerTransactionId = merchantOrderId
- Duplicate payment guard is backend-enforced (409) — frontend button state is UX only

## Blockers
- Backend not yet restarted — V23 migration + all session changes not live until restart
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
