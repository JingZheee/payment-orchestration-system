# Progress Snapshot
Last updated: 2026-05-28

## Completed
- [x] PRD.md v1.8 — all features documented; v1.7 InsureStore, v1.8 payment resumption + US-21
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V25, all entities/repos/adapters
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
- [x] Email notification on RETRY_EXHAUSTED — failure HTML email from DlqConsumer
- [x] Duplicate payment prevention — backend 409 guard, atomically updates policy status
- [x] Xendit adapter — Invoice API (collection) + Disbursements API (claims)
- [x] V22 migration — XENDIT in provider_configs + 5 PH fee rate rows; PAYMONGO disabled
- [x] Async webhook refactor — WebhookController fast-ack, WebhookConsumer, RetryConsumer
- [x] Dead Letter Queue page — requeue endpoint + full frontend
- [x] Midtrans adapter fixes — CARD→Snap API, vaNumber surfaced, providerTransactionId fix
- [x] V23 migration — va_number column added to transactions
- [x] User Management module — UserAdminController + Users frontend page
- [x] AppLayout sidebar — grouped into 5 sections; duplicate Admin label + search bar removed
- [x] InsureStore — V24+V25 migrations; store_products table; 15 seeded products (MY/ID/PH)
- [x] InsureStore — StoreProduct entity/repo/DTO; GET /store/products; multi-region support
- [x] CheckoutPage — 4-step wizard; InsureStorePage hero + region selector
- [x] InsureStore — quote-based flow: POST /store/quote saves QUOTE, emails payment link
- [x] InsureStore — CompletePaymentPage: two-panel layout, branded method icons, VA inline display
- [x] InsureStore — PaymentResultPage reads policyId; works for all three providers
- [x] InsureStore — POST /store/pay idempotent: PENDING→returns existing URL, FAILED→allows retry
- [x] V26 migration — payment_method nullable on demo_policies (method deferred to pay-time)
- [x] PaymentService — FAILED paths now set demoPolicy.transactionId; DlqConsumer syncs RETRY_EXHAUSTED status
- [x] Midtrans VA bank selection — BankPicker dropdown (BCA/BNI/BRI/CIMB) in both InsureStore + PaymentDemo
- [x] VA bank picker redesigned — antd Select with brand-colour bank badges + optionRender; slides in under VA row
- [x] PaymentResultPage (store/result) — routing section removed; customer-only view (policy no., holder, amount)
- [x] Failure email — "Retry Payment →" button with link to /store/complete?policyId=; claims email unchanged
- [x] Quote email — Payment Method row removed (method chosen at pay-time, not quote-time)
- [x] app.base-url config — injected into EmailNotificationService; wired through docker-compose.prod.yml + .env.example

## Up next (start here next session)
- [ ] Restart backend — pick up all session changes
- [ ] Smoke test RETRY_EXHAUSTED re-pay: mock ALWAYS_FAIL → exhaust → switch ALWAYS_SUCCESS → retry → ACTIVATED
- [ ] Verify failure email now includes "Retry Payment" button with correct policyId link
- [ ] Smoke test InsureStore end-to-end: MY FPX quote → pay → redirect → result page (no routing section)
- [ ] Add Xendit sandbox keys to application-dev.yml, smoke test PH invoice + disbursement
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
- FAILED/RETRY_EXHAUSTED allowed to re-initiate with fresh merchantOrderId (-R#### suffix)
- Payment method selected at pay-time (CompletePaymentPage), not at quote-time (CheckoutPage)
- Midtrans VA banks: BCA/BNI/BRI/CIMB only (Mandiri/Permata excluded — different API structure)
- store/result page is customer-only — no routing/provider/strategy data shown
- app.base-url driven by APP_BASE_URL env var; fallback http://localhost:5173 for local dev

## Blockers
- Backend needs restart to activate all session changes
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
