# Progress Snapshot
Last updated: 2026-05-26

## Completed
- [x] PRD.md v1.6 — all sessions documented; Midtrans adapter design notes added
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V23, all entities/repos/adapters
- [x] Spring Security + JWT; CORS, 401/403 fix
- [x] DB-driven payment methods — PaymentMethodEntity, composite PK; enum deleted everywhere
- [x] AdminPaymentMethodController — GET/POST/PUT/DELETE with soft-delete
- [x] React + Vite frontend — all 11 pages, service layer, TanStack Query hooks, AppLayout
- [x] Login, RequireAuth, JWT Axios interceptor; Dashboard, Transactions, Routing Rules pages
- [x] Providers, Fee Rates, Metrics, Reconciliation, PaymentMethods pages
- [x] PaymentSucceededEvent + NotificationConsumer (PREMIUM_ACTIVATED / CLAIM_DISBURSED events)
- [x] NotificationQueueController + NotificationQueuePanel (live depth counter + on/off switch)
- [x] V21 migration — demo_policies + 6 seed rows; DemoPolicy entity, repo, controller
- [x] PaymentDemo — policy/claim table with Pay/Disburse buttons + gateway redirect
- [x] RoutingRules page — region tabs, dnd-kit drag-to-reorder, priority auto-reassigned
- [x] Email notification on payment success — branded HTML, Mailtrap SMTP, non-fatal
- [x] Duplicate payment prevention — backend 409 guard, atomically updates policy status
- [x] Xendit adapter — Invoice API (collection) + Disbursements API (claims); webhook verification
- [x] V22 migration — XENDIT in provider_configs + 5 PH fee rate rows; PAYMONGO disabled
- [x] Routing Engine page (/routing) — score formula cards, live simulator, sub-score breakdown
- [x] Async webhook refactor — WebhookController fast-ack, WebhookConsumer, RetryConsumer on dedicated queue
- [x] Dead Letter Queue page — requeue endpoint + full frontend (table, InfoBanner, TransactionDetailDrawer)
- [x] **Midtrans adapter fixes (this session)**
  - CARD now routes to Snap API (`/snap/v1/transactions`, `enabled_payments: credit_card`) — hosted page, no Midtrans.js needed
  - VA number extracted and returned as `vaNumber` in PaymentResult → persisted to DB → API response
  - `providerTransactionId` = `merchantOrderId` for all Midtrans methods (fixes RETRY_EXHAUSTED on card)
  - `parseWebhookPayload` uses `order_id` (not `transaction_id`) — consistent for Core API + Snap webhooks
  - `refund`/`partial_refund` webhook status now maps to REFUNDED
  - `webhookSecret` dead field removed from MidtransProperties; `snapBaseUrl` added
  - V23 migration: `va_number VARCHAR(100)` added to `transactions`
  - Frontend: `vaNumber` field in InitiatePaymentResponse type; checkout page shows BCA VA callout or card redirect message

## Up next (start here next session)
- [ ] Restart backend (picks up V23 migration + all Midtrans code changes)
- [ ] Smoke test CARD payment — Midtrans sandbox → Snap hosted page opens → simulate card payment → verify webhook → SUCCESS
- [ ] Smoke test VA payment — verify VA number appears in checkout UI; simulate BCA transfer in Midtrans sandbox
- [ ] Add Xendit sandbox keys to application-dev.yml (secret-key + webhook-token)
- [ ] End-to-end smoke test — PH premium collection (Xendit Invoice redirect) + PH claim disbursement
- [ ] Verify email in Mailtrap — trigger premium + claim payments, confirm both HTML templates arrive
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); webhook.queue = inbound provider webhooks; retry.processing.queue = RetryConsumer
- webhook.dlq = failed async webhook processing; payment.dlq = exhausted retries (RETRY_EXHAUSTED)
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v5, feature-based structure
- PayMongo replaced by Xendit for PH — adapter kept but disabled in DB
- Xendit: Invoice API for collection (redirect), Disbursements API for claims (direct payout)
- Billplz + Midtrans are PREMIUM_COLLECTION only; MY/ID claims route to Mock
- Duplicate payment guard is backend-enforced (409) — frontend button state is UX only
- Midtrans CARD → Snap API (hosted page); all other methods → Core API
- Midtrans providerTransactionId = merchantOrderId (order_id); webhook parsed via order_id
- MetricsAggregator: 60-min window + 15-min tick intentionally wide for demo-scale volume

## Blockers
- Backend not yet restarted — V23 migration + Midtrans changes not live until restart
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
