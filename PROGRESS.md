# Progress Snapshot
Last updated: 2026-05-27

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
- [x] CheckoutPage — 4-step wizard (Personal→Coverage→Declaration→Review); NRIC auto-parse
- [x] InsureStorePage — sticky navbar, hero, trust band, dark footer; region Select + Products Dropdown
- [x] InsureStore — quote-based flow: POST /store/quote saves QUOTE, emails payment link
- [x] InsureStore — CompletePaymentPage at /complete-payment?policyId=UUID
- [x] InsureStore — PaymentResultPage reads policyId; works for all three providers
- [x] InsureStore — POST /store/pay idempotent: PENDING→returns existing URL, FAILED→allows retry
- [x] PaymentService guard fix — only blocks ACTIVATED/DISBURSED (was incorrectly blocking QUOTE)
- [x] PaymentService — updates demoPolicy.transactionId+status for PENDING/PROCESSING results
- [x] PaymentService — sets demoPolicy.status=FAILED on provider error or FAILED result
- [x] Frontend build clean — all 7 pre-existing TS errors fixed (unused imports, Recharts types, etc.)

## Up next (start here next session)
- [ ] Restart backend — pick up all backend changes (PaymentService guard fix, pay() rewrite)
- [ ] Smoke test InsureStore end-to-end: MY FPX → Billplz → payment-result page
- [ ] Smoke test PENDING resumption: pay → abandon → re-open email link → Resume Payment
- [ ] Add Xendit sandbox keys to application-dev.yml, smoke test PH invoice + disbursement
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); active retry (30s→60s→120s→DLQ) is deliberate demo trade-off
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v6, feature-based structure
- Store products are DB-driven (store_products table); features stored as pipe-separated TEXT
- Quote-based checkout: form creates QUOTE record + email; payment only on email link click
- POST /store/pay is idempotent for PENDING (returns existing URL, no new transaction)
- FAILED/RETRY_EXHAUSTED allowed to re-initiate with fresh merchantOrderId (-R#### suffix)

## Blockers
- Backend needs restart to activate all session changes
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
