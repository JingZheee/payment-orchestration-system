# Progress Snapshot
Last updated: 2026-05-26

## Completed
- [x] PRD.md v1.5 — async webhook refactor + DLQ topology documented; RabbitMQ consumer/publisher tables
- [x] Maven multi-module backend — all 7 modules, Flyway V1–V22, all entities/repos/adapters
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
- [x] **Async webhook refactor (industry standard)**
  - WebhookController: fast-ack (verify + parse + publish WebhookMessage → return 200)
  - WebhookPublisher + WebhookConsumer (pos-payment / pos-admin)
  - RetryConsumer moved to dedicated retry.processing.queue (no longer shares webhook.queue)
  - RabbitMqConfig: retry.q.* DLX routing keys fixed; retryProcessingQueue bean + binding added
  - application.yml: retry-processing queue name added
  - webhook.dlq now has a real purpose — catches failed async webhook processing
- [x] Dead Letter Queue page — full implementation
  - Backend: POST /admin/transactions/{id}/requeue (resets to PROCESSING, schedules retry attempt 1)
  - Frontend: useDlqTransactions + useRequeue hooks; DeadLetterQueue.tsx with table, InfoBanner,
    Popconfirm re-queue, row click → TransactionDetailDrawer (reused)

## Up next (start here next session)
- [ ] Start backend + verify new RabbitMQ topology in management UI (localhost:15672)
- [ ] Smoke test DLQ page — trigger RETRY_EXHAUSTED via Mock FAIL mode, verify re-queue flow
- [ ] Add Xendit sandbox keys to application-dev.yml (secret-key + webhook-token)
- [ ] End-to-end smoke test — PH premium collection (Xendit Invoice redirect) + PH claim disbursement
- [ ] Verify email in Mailtrap — trigger premium + claim payments, confirm both HTML templates arrive
- [ ] Demo data seeding — 100+ realistic transactions across all 3 regions for dashboard KPIs
- [ ] Viva prep — run 10-minute demo script end-to-end, note rough edges

## Decisions locked in
- Maven multi-module; spring-boot-maven-plugin only in pos-api
- Hexagonal architecture — PaymentProviderPort is the core contract
- RabbitMQ (not Kafka); webhook.queue = inbound provider webhooks (async); retry.processing.queue = RetryConsumer
- webhook.dlq = failed async webhook processing; payment.dlq = exhausted retries (RETRY_EXHAUSTED)
- No DB mocking in tests — Testcontainers with real PostgreSQL only
- Payment methods are DB-managed strings (not Java enum); composite PK (code, region)
- Frontend: React 18 + Vite + antd v5, feature-based structure
- PayMongo replaced by Xendit for PH — adapter kept but disabled in DB
- Xendit: Invoice API for collection (redirect), Disbursements API for claims (direct payout)
- Billplz + Midtrans are PREMIUM_COLLECTION only; MY/ID claims route to Mock
- Duplicate payment guard is backend-enforced (409) — frontend button state is UX only
- Fee rates and payment methods use soft delete (active=false) — no hard deletes anywhere
- MetricsAggregator: 60-min window + 15-min tick intentionally wide for demo-scale volume

## Blockers
- Backend not yet restarted after docker compose reset — must verify queue topology on next session
- Xendit sandbox keys must be added to application-dev.yml before PH payments can be tested
