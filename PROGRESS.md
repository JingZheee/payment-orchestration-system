# Progress Snapshot
Last updated: 2026-05-25

## Completed
- [x] PRD.md v1.4 — Xendit integration, duplicate payment defence, V22 DB map, viva points updated
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V22, all entities/repos/adapters
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
- [x] RoutingRules page — region tabs, dnd-kit drag-to-reorder, priority auto-reassigned
- [x] Frontend CSS refactor — CSS Modules + shared components across all pages
- [x] Fee Rates — backend POST+DELETE; Add Rate modal + row-level delete
- [x] Email notification on payment success — branded HTML, Mailtrap SMTP, non-fatal
- [x] Duplicate payment prevention — backend 409 guard (DuplicatePaymentException) checks demo_policies.status before initiating; policy status+transactionId updated atomically on SUCCESS; RETRY_EXHAUSTED leaves policy PENDING for retry
- [x] paymentType added to PaymentRequest DTO — flows to all provider adapters
- [x] Xendit adapter — Invoice API (GCash/Maya/GrabPay/Card collection) + Disbursements API (claim payouts); x-callback-token webhook verification
- [x] V22 migration — XENDIT in provider_configs + 5 PH fee rate rows; PAYMONGO disabled
- [x] ProviderRegionSupport — XENDIT mapped to Region.PH (bug fix: was causing 422 for all PH payments)
- [x] Frontend: XENDIT added to Provider enum + providerStyles badge (blue #0052CC)

## Up next (start here next session)
- [ ] Add Xendit sandbox keys to application-dev.yml (secret-key + webhook-token from dashboard.xendit.co)
- [ ] End-to-end smoke test with Xendit — PH premium collection (Invoice redirect) + PH claim disbursement
- [ ] Verify email in Mailtrap — trigger premium + claim payments, confirm both HTML templates arrive
- [ ] Notification queue durability demo — stop consumer → 5 payments → watch depth → drain
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); webhook failure → return 200 to prevent retry storms
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v5, feature-based structure
- PayMongo replaced by Xendit for PH — sandbox geo-restricted; adapter kept but disabled in DB
- Xendit: Invoice API for collection (redirect), Disbursements API for claims (direct payout)
- Duplicate payment guard is backend-enforced (409) — frontend button state is UX only, not security
- RETRY_EXHAUSTED leaves demo_policies.status as PENDING — policy is retryable after payment failure

## Blockers
- None (Xendit sandbox keys must be added by user before PH payments can be tested)
