# Progress Snapshot
Last updated: 2026-05-27

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
- [x] InsureStore — V24 migration; store_products table + 5 seeded MY products (DB-driven)
- [x] InsureStore — StoreProduct entity, StoreProductRepository, StoreProductResponse DTO
- [x] InsureStore — GET /store/products endpoint (public, region-filtered)
- [x] InsureStore — Multi-region support: V25 migration adds region/currency; seeds 5 ID + 5 PH products
- [x] InsureStore — DemoCheckoutRequest + InsureStoreController use dynamic region/currency (not hardcoded MY/MYR)
- [x] CheckoutPage — 4-step wizard: Personal Info (NRIC/NIK/PhilSys) → Coverage → Declaration → Payment
- [x] CheckoutPage — Product-specific coverage fields per type (life/medical/motor/travel/accident)
- [x] CheckoutPage — BNM/OJK/IC-PH declaration text per region; payment methods per region
- [x] InsureStorePage — Full redesign: sticky navbar, hero with trust stats, enhanced product cards
- [x] InsureStorePage — Coverage highlight box, type icons, trust band, dark footer
- [x] InsureStorePage — Region selector as Select dropdown in navbar; category as Dropdown under Products

## Up next (start here next session)
- [ ] Restart backend — picks up V24+V25 migrations + all store changes
- [ ] Smoke test InsureStore end-to-end: MY FPX → Billplz → payment-result page
- [ ] Smoke test VA payment — VA number in checkout UI (Midtrans Snap)
- [ ] Add Xendit sandbox keys to application-dev.yml, smoke test PH invoice + disbursement
- [ ] Verify failure email — trigger RETRY_EXHAUSTED via Mock ALWAYS_FAIL → confirm Mailtrap
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
- Multi-region checkout: region/currency taken from product row; routing engine picks provider automatically
- Checkout is a 4-step wizard; only holderName/holderEmail/insuranceType/amount/paymentMethod/region/currency sent to backend

## Blockers
- Backend not yet restarted — V24+V25 migrations not live until restart
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
