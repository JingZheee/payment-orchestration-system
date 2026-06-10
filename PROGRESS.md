# Progress Snapshot
Last updated: 2026-06-10

## Completed
- [x] PRD.md v1.9 — all features documented including customer policy status dashboard
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V26, all entities/repos/adapters
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
- [x] app.base-url config injected into EmailNotificationService; wired through docker-compose.prod.yml
- [x] Customer policy status dashboard — PolicyLookupPage + PolicyStatusPage (3-card layout)
- [x] Policy status backend — GET /store/policy/lookup + GET /store/policy/{policyId} (public)
- [x] PolicyStatusResponse DTO with full event timeline; DemoPolicyRepository lookup method added
- [x] Policy status auto-refresh every 5s when PENDING; Retry Payment button for FAILED/RETRY_EXHAUSTED
- [x] Email links — success email "View Policy Status →"; failure email "View policy status online"

## Up next (start here next session)
- [ ] Restart backend + frontend — pick up all session changes; smoke test policy status page
- [ ] Smoke test: pay → success email arrives → click "View Policy Status →" → see 3-card layout + timeline
- [ ] Smoke test: RETRY_EXHAUSTED → failure email → click "Retry Payment" + "View policy status" links
- [ ] Add Xendit sandbox keys to application-dev.yml, smoke test PH invoice + disbursement
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); active retry (30s→60s→120s→DLQ) is deliberate demo trade-off
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v5, feature-based structure, TSX + module.css in separate files
- Quote-based checkout: form creates QUOTE record + email; payment only on email link click
- POST /store/pay is idempotent for PENDING (returns existing URL, no new transaction)
- FAILED/RETRY_EXHAUSTED allowed to re-initiate with fresh merchantOrderId (-R#### suffix)
- Payment method selected at pay-time (CompletePaymentPage), not at quote-time (CheckoutPage)
- Policy status page uses UUID as implicit access token — no login required, UUID is hard to guess
- Retry Payment on status page navigates to /store/complete — no new backend endpoint needed
- store/result page is customer-only — no routing/provider/strategy data shown

## Blockers
- Backend needs restart to activate all session changes
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
