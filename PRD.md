# Product Requirements Document
# Payment Orchestration System (POS)
**Version:** 2.0
**Date:** 2026-06-12
**Type:** Final Year Project (FYP)

---

## 1. Executive Summary

The Payment Orchestration System (POS) is a backend-driven platform that intelligently routes insurance payment transactions across multiple payment providers in Southeast Asia — specifically Malaysia, Indonesia, and the Philippines. Rather than integrating directly with a single gateway, the system acts as an intelligent routing layer that sits *above* providers, deciding in real time which provider to use for each transaction based on region, provider success rate, transaction fees, and configurable business rules.

The primary use case is **insurance** — premium collection from policyholders and claims payouts to beneficiaries, where routing reliability directly affects policyholder trust and regulatory compliance. The core value proposition is **resilience and cost optimization**: when a provider is degraded or expensive, the system automatically reroutes to the best available alternative — without the insurance operator changing anything. This mirrors how large-scale platforms like Grab, Gojek, and Shopee manage payments internally, but packaged as a demonstrable, configurable system with a visual admin dashboard.

The MVP goal is a fully functional routing engine integrated with real sandbox providers (Billplz for Malaysia, Midtrans for Indonesia, Xendit for the Philippines), with a Mock provider for controlled testing, and a React admin dashboard that makes the routing intelligence *visible* — showing live decisions, failover events, cost comparisons, and provider health in real time.

---

## 2. Mission

**Mission Statement:** Demonstrate that intelligent payment routing — not just payment processing — is the differentiating layer for insurance operators, by building a configurable orchestration engine that maximizes success rates and minimizes fees across Southeast Asian payment providers for both premium collection and claims disbursement.

### Core Principles

1. **The routing engine is the product** — provider integrations are adapters, not the point.
2. **Every routing decision must be explainable** — the system records *why* it chose a provider, not just which one.
3. **Failure is a first-class feature** — the system must handle and *visibly recover from* provider failures.
4. **Sandbox-first realism** — all providers are backed by real sandbox APIs; the Mock provider simulates failure scenarios.
5. **Built to be demonstrated** — every architectural decision should produce something visible in the admin dashboard.
6. **Async by design** — webhook processing and payment retries run through a message queue, not synchronous DB polling — failures are visible, recoverable, and demonstrable.
7. **Every payment has a policy context** — transactions must be traceable to a policy number or claim reference for regulatory audit.
8. **Payout is as important as collection** — the system handles both inbound premium collection from policyholders and outbound claims disbursement to beneficiaries.
9. **Downstream actions are durable** — a successful payment publishes an event to a durable notification queue; downstream consumers (insurance activation, notifications) run independently and survive consumer restarts without message loss.

---

## 3. Target Users

### Primary Persona: FYP Examiner / Technical Panel
- Assesses system design, code quality, and problem-solving depth
- Expects to see intelligent behavior, not just a CRUD app
- Key need: understand *what is novel* within 10 minutes of the demo

### Secondary Persona: Insurance Payment Operations Manager (Demo Role)
- A fictional insurance operator managing premium collection and claims payouts across MY/ID/PH
- Manages premium collection campaigns for policyholders and processes outbound claim disbursements
- Wants to configure routing rules without writing code and generate fee reconciliation reports for compliance
- Key need: visibility into why transactions succeed or fail, traceability by policy/claim reference, and ability to tune routing behavior

### Technical Context
- The developer (student) is the sole builder
- Tech stack: Spring Boot 3, React 18 + TypeScript + Ant Design (frontend pivoted from Angular 17), PostgreSQL
- Demo environment is a local machine or VPS with public webhook URL (e.g., via ngrok)

---

## 4. MVP Scope

### Core Functionality
- ✅ Insurance premium collection with intelligent provider routing
- ✅ Claims disbursement (outbound payout) via `POST /payments/disburse`
- ✅ Policy/claim reference fields on transactions (`policy_number`, `claim_reference`, `payment_type`)
- ✅ `PaymentType` enum: `PREMIUM_COLLECTION`, `CLAIM_PAYOUT`, `REFUND`
- ✅ Admin transaction filter by `paymentType`
- ✅ Payment initiation with intelligent provider routing
- ✅ Routing engine with three strategies: region-based, success-rate-based, lowest-fee
- ✅ Composite provider scoring (success rate 40%, fee 25%, latency 15%, fee accuracy 20%)
- ✅ Configurable routing rules (priority-ordered, region/amount/currency filters)
- ✅ Routing rule simulation — test a hypothetical payment against live rules
- ✅ Automatic failover when primary provider is unavailable
- ✅ Webhook handling with HMAC signature verification per provider
- ✅ Async webhook processing via RabbitMQ (decoupled receipt from processing)
- ✅ Retry queue with exponential backoff using RabbitMQ TTL + dead letter exchange
- ✅ Dead Letter Queue (DLQ) — exhausted-retry payments visible in admin dashboard
- ✅ Idempotency — duplicate payment requests return cached response
- ✅ Full transaction event timeline (immutable audit trail per transaction)
- ✅ Admin dashboard: KPI cards, transaction list, provider health, routing rule management
- ✅ Live failover demo mode — disable a provider via dashboard, next payment auto-reroutes
- ✅ Fee comparison display — show cost difference between providers for a given transaction
- ✅ DB-driven payment methods — `payment_methods` table with composite PK (code, region); admins can add, rename, activate/deactivate methods per region without a code deploy
- ✅ Payment methods admin page — CRUD UI grouped by region; independent per-region active toggle
- ✅ Post-payment notification queue — durable RabbitMQ queue receives a `PaymentSucceededEvent` after every successful payment; consumer activates/disburses the linked insurance policy record
- ✅ Notification consumer runtime toggle — admin can stop/start the consumer at runtime; messages accumulate visibly in the queue and drain cleanly on restart (proves durability for demo)
- ✅ Insurance Payment Demo — admin-managed `demo_policies` table with seed records; a Pay button per row pre-fills the payment form and locks after submission to prevent duplicates
- ✅ Policy status lifecycle — PENDING → ACTIVATED (premium) / DISBURSED (claim) driven by the notification consumer; optimistic UI update flips status instantly on payment success
- ✅ Payment gateway redirect — successful initiation auto-opens the provider's hosted payment page in a new tab (non-localhost URLs only); a manual "Open Payment Page" button persists in the result card
- ✅ Duplicate payment prevention — layered defence: (1) backend guard in `PaymentService` checks `demo_policies.status` before initiating — throws `DuplicatePaymentException` (HTTP 409) if already ACTIVATED/DISBURSED; (2) policy status and `transaction_id` updated atomically on SUCCESS so the guard is durable across restarts; (3) frontend Pay button disabled when `status !== PENDING`; RETRY_EXHAUSTED transactions leave policy as PENDING so the policyholder can retry with a different method
- ✅ Fee rates are fully runtime-manageable — admins can create and delete rows via `POST`/`DELETE /admin/fee-rates` without any DB migration; provider auto-locks region (BILLPLZ→MY, MIDTRANS→ID, XENDIT→PH); payment method dropdown populated from the live `payment_methods` table
- ✅ Customer email notification on payment success — branded HTML email dispatched to the policy holder's email address (`demo_policies.holder_email`) after every successful `PREMIUM_COLLECTION` ("Your Policy is Now Active") and `CLAIMS_DISBURSEMENT` ("Claim Disbursement Processed") payment; email failure is non-fatal and never affects the payment transaction
- ✅ InsureStore — customer-facing insurance storefront at `/buy`; DB-driven product catalogue from `store_products` table; region selector (MY/ID/PH) with per-region product set and currency
- ✅ InsureStore — multi-region product support: V24+V25 migrations seed 15 products (5 MY/MYR, 5 ID/IDR, 5 PH/PHP) covering life, medical, motor, travel, and accident insurance
- ✅ InsureStore — 4-step checkout wizard: Personal Info (NRIC/NIK/PhilSys with auto-parse for MY), Coverage Details (product-specific fields per insurance type), Declaration & Disclosure (BNM/OJK/IC-PH regulatory text per region), Review & Quote
- ✅ InsureStore — quote-based payment flow: form submission creates a `QUOTE` record and emails the customer a one-click payment link; payment is only initiated when the customer explicitly clicks the link — eliminates back-button duplicate payment issues
- ✅ InsureStore — quote email: branded HTML email with plan summary, quote reference, "Complete Payment →" button, 7-day validity notice; sent via `EmailNotificationService` (same SMTP stack as payment confirmation emails)
- ✅ InsureStore — `/complete-payment?policyId=UUID` page: shows quote summary; "Pay [amount]" button initiates payment via the routing engine; idempotent re-pay — PENDING state returns the **existing** provider checkout URL (no new transaction created, per industry standard); FAILED/RETRY_EXHAUSTED state shows retry banner and allows a fresh attempt with a new merchant order ID; ACTIVATED auto-redirects to payment-result; ACTIVATED/DISBURSED rejected with 409
- ✅ InsureStore — provider routing is fully region-aware: MY quotes route to Billplz, ID to Midtrans, PH to Xendit/Mock — the same `RoutingEngine` used by all other payment flows; no special-casing in the store controller
- ✅ InsureStore — payment result page at `/payment-result?policyId=UUID`: shows payment status from DB (SUCCESS/FAILED/PENDING), provider used, routing strategy, processing fee (region-formatted), and policy number with copy button; works for all three providers
- ✅ Customer policy status dashboard — public `/store/policy/:policyId` page showing policy details, payment info, and append-only event timeline; customers navigate directly from email link (UUID acts as access token) or via lookup form (email + policy number); status auto-refreshes every 5 seconds for PENDING payments
- ✅ Policy lookup form — `/store/policy` accepts email + policy number, verifies ownership, redirects to UUID-based status page; success email gains "View Policy Status →" button; failure email gains "View policy status online" link below the retry button
- ✅ Reconciliation settlement import — admin uploads a provider settlement `.xlsx` file; system matches rows to internal transactions by `merchant_order_id`, computes `variance = actual_fee − expected_fee` using the fee snapshotted at transaction time (immune to fee rate changes), auto-flags anomalies where `|variance_pct| > 5%`; returns import summary (matched / unmatched / missing fee / skipped / anomalies); downloadable pre-filled template generated from unreconciled transactions; aggregate KPI strip shows real totals across all records, not just current page

### Providers
- ✅ Billplz sandbox (Malaysia — FPX bank transfer)
- ✅ Midtrans sandbox (Indonesia — Virtual Account/BCA, QRIS, GoPay, Card via Snap API)
- ✅ Xendit sandbox (Philippines — GCash, Maya, GrabPay, cards via Invoice API; claim disbursements via Disbursements API)
- ✅ Mock provider (controllable success/failure, simulates any region/method)
- ❌ PayMongo (Philippines — sandbox geo-restricted to PH; replaced by Xendit; adapter retained, disabled in DB)
- ❌ Direct FPX PayNet API (requires business registration)
- ❌ TNG eWallet direct API (no public sandbox)
- ❌ GCash direct API (no sandbox exists)
- ❌ GrabPay direct API (requires merchant account)

### Technical
- ✅ Spring Boot 3 Maven multi-module backend
- ✅ PostgreSQL with Flyway versioned migrations
- ✅ Spring Security + JWT (stateless access token + DB-tracked refresh token)
- ✅ REST API with OpenAPI/Swagger documentation
- ✅ React 18 + TypeScript + Ant Design admin SPA (pivoted from Angular 17)
- ✅ RabbitMQ for async webhook processing, retry queue, and post-payment notification queue
- ✅ Dead Letter Queue (DLQ) for exhausted-retry transactions
- ✅ Provider metrics aggregation (15-minute rolling window via scheduled job)
- ✅ Audit log for all admin actions
- ❌ Apache Kafka (over-engineered for this scale — RabbitMQ is the correct tool)
- ❌ Mobile app
- ❌ Multi-tenant (multi-merchant) support
- ❌ Real money transactions
- ❌ PCI DSS compliance
- ❌ Card tokenization / vaulting
- ❌ Subscription / recurring billing (no scheduler infrastructure — future phase)
- ❌ Grace period / policy lapse logic (insurance business rules — future phase)
- ❌ Beneficiary bank account management (out of scope — FYP demo)

### Deployment
- ✅ Local development with Docker Compose (PostgreSQL + RabbitMQ)
- ✅ Webhook exposure via ngrok for sandbox callbacks
- ✅ Environment-specific config (dev/prod profiles)
- ❌ Cloud deployment (AWS/GCP) — optional stretch goal
- ❌ CI/CD pipeline

---

## 5. User Stories

### US-1: Intelligent Payment Routing
**As a** merchant submitting a payment from Indonesia,
**I want** the system to automatically select the best available provider,
**so that** I don't have to hardcode provider logic or manually handle failures.

*Example:* POST `/api/v1/payments/initiate` with `region: ID`, `amount: 50000 IDR` → system scores Midtrans (VA) highest → routes there → returns redirect URL.

---

### US-2: Live Failover Recovery
**As a** merchant watching a live demo,
**I want** to see the system automatically recover when a provider goes down,
**so that** I understand the resilience value of orchestration vs. direct integration.

*Example:* Admin disables Midtrans in the dashboard → next Indonesian payment scores Midtrans 0 → routes to Mock fallback → transaction completes → event log shows "Provider Midtrans unavailable, routed to MOCK (fallback)."

---

### US-3: Routing Rule Configuration
**As an** admin,
**I want** to create rules that force specific providers for certain regions or amounts,
**so that** I can implement business logic (e.g., "always use Billplz for MY transactions under RM 50") without code changes.

*Example:* Create rule: `region=MY, max_amount=50, preferred_provider=BILLPLZ, priority=1` → all qualifying Malaysian payments skip the scoring engine and go straight to Billplz.

---

### US-4: Routing Rule Simulation
**As an** admin,
**I want** to test what provider a hypothetical payment would route to before going live,
**so that** I can verify my rules are configured correctly.

*Example:* POST `/api/v1/admin/routing-rules/simulate` with `{region: PH, amount: 500, currency: PHP, method: EWALLET}` → response: `{provider: PAYMONGO, reason: "Rule #3 matched: PH e-wallet", score: 0.91}`.

---

### US-5: Transaction Visibility
**As an** admin,
**I want** to see a full timeline of events for any transaction,
**so that** I can diagnose why a payment succeeded, failed, or is stuck.

*Example:* Click transaction `txn_abc123` → see timeline: INITIATED → ROUTED (to Midtrans, score 0.87) → PROVIDER_CALLED → WEBHOOK_RECEIVED → STATUS_CHANGED (PROCESSING → SUCCESS).

---

### US-6: Provider Cost Comparison
**As an** admin reviewing the dashboard,
**I want** to see total fees paid per provider and the estimated savings from intelligent routing,
**so that** I can justify using the orchestration layer to stakeholders.

*Example:* Dashboard card: "Routing optimization saved RM 124.50 this week by preferring Billplz over Xendit for low-value MY transactions."

---

### US-7: Webhook Idempotency
**As a** provider sending duplicate webhook callbacks,
**I want** the system to process the first and silently ignore duplicates,
**so that** transactions don't get double-processed or status gets corrupted.

*Example:* Midtrans fires the same `payment.success` webhook twice → second call hits `idempotency_records` table → returns 200 with cached response → transaction status unchanged.

---

### US-9: Dead Letter Queue Visibility
**As an** admin,
**I want** to see payments that have exhausted all retry attempts in a dedicated DLQ view,
**so that** I can identify stuck transactions and take manual action (re-queue or mark failed).

*Example:* Payment fails on Midtrans → enters retry queue → retried 3 times with exponential backoff (30s, 60s, 120s) → still failing → moves to DLQ → admin sees it in dashboard under "Dead Letter Queue" with full error history → clicks "Re-queue" after provider is restored.

---

### US-10: Insurance Policy Context
**As an** insurance admin reviewing transactions,
**I want** every payment to carry a policy number or claim reference,
**so that** I can trace any transaction back to a specific policy in the audit log.

*Example:* POST `/payments/initiate` with `policyNumber: "POL-2026-MY-00123"` → stored on transaction → visible in admin transaction detail → reconciliation report links fee to that policy.

---

### US-11: Claims Disbursement
**As an** insurance operator,
**I want** to initiate outbound claim payouts to policyholders via the same routing layer,
**so that** the system selects the lowest-fee provider for the disbursement region automatically.

*Example:* POST `/payments/disburse` with `claimReference: "CLM-456"`, `amount: 5000 MYR`, `region: MY` → routing engine selects Billplz FPX for lowest-fee MYR payout → returns disbursement status and transaction ID.

---

### US-12: Payment Type Filtering
**As an** admin,
**I want** to filter the transaction list by payment type (premium collection vs claim payout),
**so that** I can generate separate reconciliation reports for underwriting and claims departments.

*Example:* GET `/admin/transactions?paymentType=CLAIM_PAYOUT` → returns only outbound payout transactions → admin exports for claims department compliance reporting.

---

### US-8: Mock Provider Demo Control
**As a** developer demoing the system,
**I want** to configure the Mock provider to simulate failures, delays, or specific responses,
**so that** I can reliably demonstrate failover and retry behavior without needing a real provider to fail.

*Example:* Set Mock provider to `FAIL` mode → initiate payment → system retries twice → falls back to real provider → demo complete without any real-world dependency.

---

### US-13: Post-Payment Insurance Activation
**As an** insurance operator,
**I want** premium collection and claim disbursement payments to automatically trigger downstream insurance actions (policy activation, claim payout confirmation),
**so that** the payment event drives insurance state changes without manual reconciliation.

*Example:* Payment succeeds → `PaymentSucceededEvent` published → `NotificationConsumer` picks it up → writes `PREMIUM_ACTIVATED` event to transaction timeline → marks the linked demo policy as `ACTIVATED`.

---

### US-14: Notification Queue Durability Demo
**As a** developer demoing the system to an examiner,
**I want** to stop the notification consumer at runtime so queued messages visibly accumulate, then restart it so they drain instantly,
**so that** I can prove RabbitMQ guarantees message durability — no events are lost when the consumer is offline.

*Example:* Providers page → Notification Queue panel → toggle consumer OFF → initiate 5 payments → queue depth climbs to 5 → toggle ON → depth drains to 0 in seconds → transaction timelines each show `PREMIUM_ACTIVATED`.

---

### US-15: Insurance Payment Operations Demo
**As a** demo user simulating an insurance operations manager,
**I want** to see a table of pre-loaded policies and claims with a Pay button per row,
**so that** the demo looks like a real insurance back-office system rather than a bare payment form.

*Example:* Payment Demo page shows "Premium Collection" and "Claims Disbursement" tabs, each with a table of seeded records. Clicking Pay pre-fills the form with the policy number, region, and amount. After payment succeeds, the row turns green (ACTIVATED / DISBURSED) without any manual refresh.

---

### US-16: Duplicate Payment Prevention
**As a** demo user,
**I want** the Pay button to lock immediately after I click it — even before the API responds — and stay locked once a payment is submitted,
**so that** I cannot accidentally create duplicate charges for the same policy by double-clicking or re-navigating.

*Example:* Click Pay → button becomes disabled immediately → payment pending → success → policy status flips to ACTIVATED → button remains disabled. Navigating away and back still shows the locked state until the page reloads (or policy status refreshes from the DB).

---

### US-17: Customer Email Notification on Payment Success
**As a** policyholder or claimant,
**I want** to receive an email confirmation when my payment is successfully processed,
**so that** I have a record of my premium activation or claim disbursement without logging into any portal.

*Example (Premium):* Ahmad pays his life insurance premium → payment succeeds → email arrives at `ahmad.razif@mymail.com` with subject "Payment Successful — Life Policy POL-2026-MY-001 is Now Active" → body shows amount, policy number, provider used, and date.

*Example (Claim):* Elena's claim disbursement completes → email arrives at `elena.villanueva@ph.com` with subject "Claim Disbursement Processed — Reference CLM-2026-PH-002" → body shows disbursed amount, claim reference, provider, and date.

**Implementation:** `EmailNotificationService` is called by `NotificationConsumer` after the demo policy record is updated. Uses `JavaMailSender` (Spring Mail) with Mailtrap sandbox SMTP in dev. Email is non-fatal — SMTP failure logs a warning and does not roll back the database transaction.

---

### US-18: Customer Insurance Store
**As a** prospective policyholder browsing insurance options,
**I want** to see a professional storefront with products relevant to my country,
**so that** I can compare plans and select one without needing to speak to an agent.

*Example:* Customer visits `/buy`, selects "Indonesia" from the region dropdown → sees 5 IDR-priced products (Life, Medical, Motor, Travel, Accident) with coverage highlights and monthly premiums. Clicks "Get Started →" on the Medical plan → enters checkout.

---

### US-19: Quote-Based Checkout
**As a** prospective policyholder filling out an insurance application,
**I want** to receive a payment link by email rather than being redirected to a payment page immediately,
**so that** I can review the quote at my own pace, share it with a family member, or complete it later without losing my application details.

*Example:* Customer completes the 4-step wizard (personal info, coverage, declaration, review) → clicks "Get My Quote — Email Payment Link" → sees "Check Your Email" confirmation screen with quote reference `POL-MY-xxxxxxx` → receives a branded HTML email within seconds → nothing has been charged yet.

**Why quote-first instead of direct redirect:**
- Eliminates back-button duplicate payments — payment is only initiated when the customer explicitly clicks the email link
- Customers are not forced to pay immediately on an unfamiliar device or connection
- The quote record captures the lead even if the customer never pays — visible to ops team in `demo_policies` table (status = QUOTE)
- Mirrors the flow used by major insurers (Great Eastern, Prudential) who email policy documents before collecting payment

---

### US-20: Complete Payment from Email
**As a** prospective policyholder who received a quote email,
**I want** to click the payment link and be taken directly to a summary page with a single "Pay" button,
**so that** I don't have to re-enter any details and can complete the purchase in one click.

*Example:* Customer opens email → clicks "Complete Payment →" → arrives at `/complete-payment?policyId=UUID` → sees a summary card (name, plan, payment method, amount) and a prominent amber "Pay MYR 99.00" button → clicks Pay → routing engine selects provider based on region → redirected to Billplz (MY) / Midtrans (ID) / Xendit (PH) hosted payment page → completes payment → redirected to `/payment-result?policyId=UUID` showing policy number, provider used, and routing strategy.

**Payment resumption (industry-standard idempotency):** If the customer presses back from the provider page (or re-opens the email link), `/complete-payment` detects `status=PENDING` and shows a "Resume Payment" button. Clicking it calls `POST /store/pay` again, which detects the existing PENDING transaction and returns the **same** provider checkout URL — no new transaction is created. This matches the pattern used by Midtrans, Xendit, and Billplz, where provider checkout URLs (Snap token, invoice URL, bill URL) are valid for up to 24 hours and can be re-presented. Double-charging is architecturally impossible: `PaymentService` blocks re-initiation for ACTIVATED/DISBURSED policies, and the PENDING path never creates a second transaction.

---

### US-22: Customer Policy Status Self-Service
**As a** policyholder who has purchased insurance or had a payment fail,
**I want** to check my policy and payment status online without calling support,
**so that** I can see what happened, why, and what to do next (e.g. retry a failed payment).

*Example (success):* Ahmad receives his confirmation email → clicks "View Policy Status →" → arrives at `/store/policy/{uuid}` → sees: "Active" badge, policy number, insurance type, MYR amount, provider used, routing reason, and a chronological event timeline (Payment Initiated → Webhook Received → Policy Activated) with UTC timestamps.

*Example (failure):* Customer's payment fails → failure email includes both "Retry Payment →" and "View policy status online" link → customer clicks status link → sees: "Failed" badge, red event timeline, and an amber "Retry Payment →" button that returns them to `/store/complete?policyId=xxx`.

*Example (lookup fallback):* Customer can't find the email → navigates to `/store/policy` → enters email + policy number → verified against DB → redirected to the UUID status page.

**Implementation:** Two new public endpoints under `/api/v1/store/**` (already permit-all): `GET /store/policy/lookup?email=&policyNumber=` returns `{ policyId }` UUID; `GET /store/policy/{policyId}` returns full status including event timeline. UUID acts as an implicit access token — 122 bits of entropy, not enumerable. Frontend auto-refreshes every 5 seconds when status is PENDING or PROCESSING.

---

### US-21: Payment Resumption and Retry
**As a** prospective policyholder who started a payment but didn't complete it,
**I want** to re-open my payment email link and resume exactly where I left off — or try again if my payment failed —
**so that** I never lose my application details and can complete the purchase without starting from scratch.

*Scenario A (abandoned payment):* Customer clicks "Pay" on `/complete-payment`, is redirected to Billplz, closes the browser. Re-opens the email link → sees "Payment In Progress" screen with a "Resume Payment" button → clicks it → redirected to the **same** Billplz payment page (no new transaction created; same bill URL, valid for up to 30 days).

*Scenario B (failed payment):* Customer's FPX bank rejects the transaction. Provider sends FAILED webhook → policy status → FAILED → `/complete-payment` shows the quote summary again with a red "Previous payment attempt failed" banner → customer clicks "Pay MYR 99.00" again → new transaction created (new merchantOrderId) → routed to provider again.

*Scenario C (already paid):* Customer re-opens the email link after successful payment → `GET /store/result` returns ACTIVATED → frontend auto-redirects to `/payment-result` — the Pay button is never shown.

**Implementation notes:**
- `POST /store/pay` is idempotent for PENDING: checks `policy.transactionId != null` + `transaction.redirectUrl != null` → returns stored URL, no provider API call
- Retry merchantOrderId format: `INS-{8-char-policy-id}-R{timestamp-mod-10000}` — prevents provider `order_id` already-exists errors
- `PaymentService.initiatePayment()` only throws `DuplicatePaymentException` for ACTIVATED/DISBURSED policies — QUOTE, FAILED, and RETRY_EXHAUSTED all pass through to allow new transactions

---

## 6. Core Architecture & Patterns

### Architecture Style
Hexagonal Architecture (Ports & Adapters) for the backend. The core domain never depends on provider SDKs — all provider communication goes through a `PaymentProviderPort` interface. Adding a new provider = one new adapter class, zero changes to the routing engine or payment service.

### Maven Module Structure
```
payment-orchestration-backend/          (parent POM)
├── pos-common/                         (enums, DTOs, exceptions, utils)
├── pos-domain/                         (JPA entities + Spring Data repositories)
├── pos-provider/                       (PaymentProviderPort interface + all adapters)
├── pos-routing/                        (routing engine, strategies, scorer)
├── pos-payment/                        (payment service, webhook, retry, idempotency)
├── pos-admin/                          (dashboard, rule management, metrics)
└── pos-api/                            (controllers, security, filters — runnable app)
```

**Dependency order (build bottom-up):**
```
pos-common → pos-domain → pos-provider ┐
                        → pos-routing  ┤→ pos-payment → pos-admin → pos-api
```

### React Frontend Structure
```
payment-orchestration-frontend/src/
├── lib/                   (axios instance, endpoints.ts)
├── layouts/               (AppLayout — Sider + Header + Outlet)
├── shared/
│   ├── components/        (RequireAuth)
│   └── types/             (transaction, feeRate, recon, paymentMethod, enums)
└── features/
    ├── auth/              (/login)
    ├── dashboard/         (/dashboard — KPIs, charts, provider breakdown)
    ├── transactions/      (/transactions — filterable table + event timeline)
    ├── routing-rules/     (/routing-rules — CRUD table + simulate panel)
    ├── providers/         (/providers — health, toggle, fee config)
    ├── fee-rates/         (/fee-rates — inline-editable table by provider/region)
    ├── payment-methods/   (/payment-methods — CRUD grouped by region, active toggle)
    ├── metrics/           (/metrics — success rate + latency charts)
    ├── reconciliation/    (/reconciliation — recon statements + anomaly filter)
    ├── dead-letter-queue/ (/dead-letter-queue — RETRY_EXHAUSTED transactions)
    ├── payment-demo/      (/payment-demo — trigger test payments, show routing decision)
    ├── routing/           (/routing — Routing Engine page: composite score formula, live simulator, strategy comparison)
    └── policy-status/     (/store/policy, /store/policy/:policyId — customer policy lookup form + status dashboard)
```

### Key Design Patterns
- **Port & Adapter** — `PaymentProviderPort` is the core contract; all 4 providers implement it
- **Strategy Pattern** — `RoutingStrategy` interface with `RegionBasedStrategy`, `SuccessRateStrategy`, `LowestFeeStrategy`
- **Composite Scoring** — `ProviderScorer` assigns weighted scores: success rate (40%) + fee (25%) + latency (15%) + fee accuracy (20%)
- **Idempotency Filter** — servlet filter intercepts requests with `Idempotency-Key` header before hitting service layer
- **Immutable Event Log** — `transaction_events` table is append-only; no updates, only inserts
- **Scheduled Metrics** — `MetricsAggregator` runs every 15 minutes to compute rolling metrics per provider per region over a 60-minute window. Window and tick are intentionally wide for the demo context: with low transaction volume (tens of transactions, not thousands), a 5-minute window would almost always be empty and produce meaningless scores. Production systems (e.g. Razorpay) use a 5-minute primary window with a 1-minute tick, which only makes sense at scale where each provider sees hundreds of transactions per minute. **Latency** is measured as the duration of the `provider.initiatePayment()` API call only — stored in `transactions.provider_latency_ms` at the time of each payment — rather than `updatedAt − createdAt`, which would include user think time for async/redirect flows. **Success rate** is computed over terminal-state transactions only (SUCCESS + FAILED + RETRY_EXHAUSTED), excluding in-flight PENDING/PROCESSING rows whose final status is unknown, to prevent the denominator from being inflated mid-window.
- **Message Queue (Async)** — RabbitMQ decouples webhook receipt from processing, and drives the retry pipeline via TTL + DLQ

### RabbitMQ Topology
```
Exchanges & Queues:

[Provider Webhook]  POST /webhooks/{provider}
                      → verify signature + parse payload inline (fast, cheap)
                      → publish WebhookMessage to webhook.exchange
                      → return 200 immediately

                    webhook.exchange (direct)
                      └→ webhook.queue              ← WebhookConsumer (async DB update)
                              └→ on NACK → webhook.dlq  (failed webhook processing — manual review)

[Payment Retry]     retry.exchange (direct)
                      └→ retry.q.30s   (TTL: 30s,  DLX → retry.processing.queue)
                      └→ retry.q.60s   (TTL: 60s,  DLX → retry.processing.queue)
                      └→ retry.q.120s  (TTL: 120s, DLX → retry.processing.queue)
                      └→ retry.processing.queue    ← RetryConsumer (polls provider for status)
                      └→ payment.dlq               ← DlqConsumer (marks RETRY_EXHAUSTED)

[Payment Success]   notification.exchange (direct)
                      └→ payment.notification.queue ← NotificationConsumer (toggleable at runtime)
                              → writes TransactionEvent (PREMIUM_ACTIVATED / CLAIM_DISBURSED)
                              → marks linked demo_policy record ACTIVATED / DISBURSED
                              No TTL, no DLX — messages persist until consumer processes them
```

**Queue responsibilities:**

| Queue | Consumer | Purpose |
|---|---|---|
| `webhook.queue` | `WebhookConsumer` | Inbound provider webhook events — updates transaction status |
| `webhook.dlq` | Manual review | Webhook messages that failed processing (NACK'd) |
| `retry.q.30s/60s/120s` | — | TTL holding queues; expired messages DLX to `retry.processing.queue` |
| `retry.processing.queue` | `RetryConsumer` | Polls provider for status after TTL expiry |
| `payment.dlq` | `DlqConsumer` | Exhausted retries — marks transaction `RETRY_EXHAUSTED` |
| `payment.notification.queue` | `NotificationConsumer` | Post-payment insurance activation / email dispatch |

**Why RabbitMQ, not Kafka:**
- RabbitMQ is purpose-built for task queues, routing, and dead letter patterns
- Kafka is a log-streaming platform designed for millions of events/second — overkill for this scale
- RabbitMQ's dead letter exchange (DLX) + message TTL gives native exponential backoff without custom code
- Spring AMQP integrates with Spring Boot trivially (`@RabbitListener`, `RabbitTemplate`)
- A technical examiner asking "why not Kafka?" has a clear, correct answer

---

## 7. Core Features

### Feature 1: Routing Engine
The heart of the system. Given a payment request, evaluates:
1. **Active routing rules** (priority-ordered, first match wins)
2. If no rule matches: **composite scoring** across all available providers for the region
3. Returns a `RoutingDecision` with: chosen provider, fallback provider, strategy used, human-readable reason, composite score

Routing Decision factors:
- Provider `is_enabled` (hard gate — disabled providers score 0)
- Provider supports the request's region and currency
- Historical success rate (from `provider_metrics` rolling window)
- Fee for this transaction amount
- Average latency

### Feature 2: PaymentProviderPort Contract
Every provider implements:
```
initiatePayment(request)                         → redirect URL or direct result
queryPaymentStatus(txnId)                        → current status poll
initiateRefund(request)                          → refund result
verifyWebhookSignature(body, headers)            → boolean
parseWebhookPayload(body)                        → normalized WebhookParseResult
calculateFee(amount, currency, paymentMethod)    → BigDecimal (paymentMethod is String)
supportedMethods()                               → List<String> (e.g. ["FPX","CARD","EWALLET"])
supportedPaymentTypes()                          → List<PaymentType> (PREMIUM_COLLECTION and/or CLAIMS_DISBURSEMENT)
isAvailable()                                    → boolean (circuit breaker backed)
```

Payment methods are DB-managed strings, not a Java enum. The `payment_methods` table (V20) stores available codes per region with an `is_active` flag that admins can toggle at runtime.

#### Provider Payment Type Capabilities

Not all providers support outbound claim disbursements — only Xendit exposes a real Disbursements API. The routing engine filters out ineligible providers in `eligibleProviders()` before scoring or applying rules, so a claim disbursement can never accidentally be routed to a collection-only provider.

| Provider | PREMIUM_COLLECTION | CLAIMS_DISBURSEMENT | Notes |
|---|---|---|---|
| Billplz (MY) | ✅ | ❌ | `/bills` endpoint is collection-only; no payout API in sandbox |
| Midtrans (ID) | ✅ | ❌ | Core API (`/charge`) for VA/QRIS/GoPay; Snap API (`/snap/v1/transactions`) for Card; Iris Disbursement API requires separate approval |
| Xendit (PH) | ✅ | ✅ | `initiatePayment` routes to `/v2/invoices` (collection) or `/disbursements` (claims) based on `paymentType` |
| Mock | ✅ | ✅ | Handles all payment types for all regions; used as fallback for MY/ID claim disbursements |

**Routing consequence:** MY and ID claim disbursements are automatically routed to the Mock provider (the only eligible provider for those regions that declares disbursement support). PH claim disbursements route to Xendit via the real Disbursements API.

#### Midtrans Adapter — Design Notes

Midtrans exposes two separate APIs and the adapter uses both depending on payment method:

| Method | API Used | Endpoint | Returns |
|---|---|---|---|
| `VIRTUAL_ACCOUNT` | Core API | `POST /v2/charge` (`payment_type: bank_transfer`, `bank: bca`) | BCA VA number in `va_numbers[0].va_number`; no redirect URL |
| `QRIS` | Core API | `POST /v2/charge` (`payment_type: qris`) | QR code URL in `actions[].generate-qr-code` |
| `GOPAY` / `EWALLET` | Core API | `POST /v2/charge` (`payment_type: gopay`) | Deep-link URL in `actions[].deeplink-redirect`; EWALLET maps to GoPay (dominant sandbox e-wallet) |
| `CARD` | Snap API | `POST /snap/v1/transactions` (`enabled_payments: ["credit_card"]`) | Hosted payment page `redirect_url`; opened in new tab automatically |

**Why Snap for CARD?** Midtrans Core API card charges require client-side tokenization via Midtrans.js running in the browser — the `token_id` must be generated on the frontend before calling the backend. Snap API avoids this by returning a hosted payment page URL where the customer enters card details directly. This keeps all card-handling within Midtrans's PCI-compliant environment without any frontend SDK integration.

**`providerTransactionId` = `merchantOrderId` (all Midtrans methods)**

The adapter stores `merchantOrderId` (i.e., the `order_id` sent to Midtrans) as `providerTransactionId` rather than Midtrans's internal `transaction_id`. Reasons:

1. **Status polling works for all methods** — `GET /v2/{orderId}/status` is valid on the Core API for all payment types. Midtrans's internal `transaction_id` only exists once a charge is created (not available for Snap sessions until the customer pays).
2. **Snap card sessions have no `transaction_id` at charge time** — the Snap API returns a `token` and `redirect_url`, not a `transaction_id`. Polling `/v2/{snapToken}/status` against the Core API fails with a connection error because Snap tokens are not valid Core API transaction identifiers.
3. **Webhook matching is consistent** — Midtrans webhooks (both Core API and Snap) include `order_id` in the payload. `parseWebhookPayload` extracts `order_id` as the identifier, which matches the stored `providerTransactionId` for all methods. Using `transaction_id` from the webhook would fail for Snap card flows where no `transaction_id` was stored at initiation time.

**VA number surfacing**

For `VIRTUAL_ACCOUNT` payments the BCA VA number is extracted from `va_numbers[0].va_number` in the charge response and returned as `vaNumber` in `PaymentResult` → persisted to `transactions.va_number` (V23 migration) → included in `InitiatePaymentResponse`. The checkout UI displays it as a copyable blue callout with "Pay via BCA mobile / ATM" instructions. There is no redirect URL for VA payments — the customer transfers money independently.

**Webhook signature verification**

Midtrans embeds the signature in the webhook body itself (not in a header). Verification: `SHA-512(order_id + status_code + gross_amount + serverKey)` compared against `payload.signature_key`. The `serverKey` is the same key used for API auth — there is no separate webhook secret for Midtrans (unlike Billplz and Xendit).

### Feature 3: Mock Provider
Configurable behavior via admin dashboard or `application.yml`:
- **ALWAYS_SUCCESS** — all payments succeed immediately
- **ALWAYS_FAIL** — all payments fail (triggers failover demo)
- **RANDOM** — configurable % success rate
- **DELAYED** — succeeds but takes N seconds (tests timeout handling)
- Supports all regions and currencies — stands in for any real provider during demo

### Feature 4: Async Webhook Processing (RabbitMQ)

**Fast-ack pattern** — the controller does only cheap, synchronous work (signature verification + payload parsing), publishes a `WebhookMessage` to the queue, and returns 200 immediately. All DB work runs asynchronously in `WebhookConsumer`.

```
POST /webhooks/{provider}   [WebhookController — synchronous, lightweight]
  → Signature verification  (HMAC-SHA256 / x-callback-token per provider)
  → Payload parsing         (normalize raw body / form params → WebhookMessage)
  → Publish WebhookMessage  (provider, providerTransactionId, status, rawPayload,
                             signatureValid, receivedAt) to webhook.exchange → webhook.queue
  → Return 200 immediately  (provider gets fast ACK before any DB work)

[Async — WebhookConsumer listening on webhook.queue]
  → Reconstruct WebhookParseResult from WebhookMessage
  → If signatureValid=false: log to webhook_logs only, do not update transaction
  → If signatureValid=true:
      → Update transaction status (PROCESSING → SUCCESS / FAILED)
      → Write TransactionEvent (STATUS_UPDATED with previous → new status)
      → If newly SUCCESS: publish PaymentSucceededEvent to notification queue
      → Log to webhook_logs (with transaction_id + processed_at)
  → ACK message
  → On unhandled exception: NACK → RabbitMQ dead-letters to webhook.dlq
```

**Why async matters:** Payment providers (Billplz, Midtrans, Xendit) expect a 200 response within ~5 seconds or they retry the webhook — potentially hundreds of times. The fast-ack pattern decouples receipt reliability from processing reliability: even if the DB is momentarily slow, the provider gets its ACK and stops retrying. If the consumer crashes mid-processing, the message is NACK'd and lands in `webhook.dlq` for manual inspection — no webhook is silently lost.

**Why `webhook.dlq` now has a real purpose:** Before this refactor, `WebhookController` processed webhooks synchronously, so `webhook.dlq` was dead infrastructure — nothing ever flowed into it. With async processing, any exception thrown by `WebhookConsumer` results in a NACK, and the raw `WebhookMessage` lands in `webhook.dlq` where an admin can inspect the payload and trigger a re-process.

### Feature 5: Admin Dashboard
Key screens:
- **Dashboard Home** — total transactions, overall success rate, active providers count, regions covered, status breakdown chart, volume by provider chart. A clickable "Routing Engine →" card links to the dedicated routing simulator page.
- **Transaction List** — filterable by status/provider/region/currency/date range
- **Transaction Detail** — full event timeline, routing decision explanation (`routingStrategy`, `routingReason`), provider response
- **Routing Rules** — priority-ordered list, create/edit modal, enable/disable toggle, drag-to-reorder
- **Routing Engine** — dedicated simulator page; see Feature 11
- **Provider Config** — enable/disable, edit fee structure, view live health status; **Notification Queue Panel** at the bottom shows live queue depth and consumer on/off toggle
- **Dead Letter Queue Panel** — list of transactions that exhausted all retries, with error history and "Re-queue" / "Mark Failed" actions
- **Payment Demo** — DB-backed policy/claim table with Pay button per row; clicking Pay pre-fills the form; routing decision result shown after initiation including provider redirect link

### Feature 6: Retry Queue with Dead Letter Queue (RabbitMQ)

Replaces the naive `@Scheduled` DB polling approach with event-driven retries. The retry pipeline is fully separate from the webhook pipeline — `retry.processing.queue` is dedicated to `RetryConsumer`, while `webhook.queue` is dedicated to `WebhookConsumer`. They do not share any queue.

```
Payment initiated → provider returns PENDING or PROCESSING (webhook expected later)
  → RetryPublisher publishes RetryMessage { transactionId, attemptNumber }
       attempt 1 → retry.q.30s   (TTL: 30,000ms)
       attempt 2 → retry.q.60s   (TTL: 60,000ms)
       attempt 3 → retry.q.120s  (TTL: 120,000ms)
       attempt 4+ → payment.dlq  (terminal)

  → On TTL expiry: message DLX'd to retry.exchange → retry.processing.queue

[RetryConsumer listening on retry.processing.queue]
  → Load transaction from DB
  → If already SUCCESS/FAILED/RETRY_EXHAUSTED: skip (webhook arrived first)
  → Call queryPaymentStatus() on provider
       → If SUCCESS or FAILED: update transaction, publish PaymentSucceededEvent if SUCCESS, done
       → If still PENDING/PROCESSING + attempt < 4: re-publish with attempt+1
       → If attempt ≥ 4: message was already routed directly to payment.dlq

[DlqConsumer listening on payment.dlq]
  → Mark transaction RETRY_EXHAUSTED
  → Write TransactionEvent ("Payment failed after N retry attempts")
  → Transaction visible in admin DLQ panel
```

**Demo moment:** Set Mock provider to DELAYED mode → initiate payment → watch retry queue drain through 3 attempts on the dashboard → transaction appears in DLQ panel → admin clicks "Re-queue" after switching Mock to SUCCESS mode → transaction completes.

**Architectural rationale — active polling vs webhooks-first:**

In production payment systems (Stripe, Adyen, Xendit), the standard pattern is **webhooks as the primary status signal** and a **scheduled reconciliation job** (hourly or nightly) to backfill any missed events — not an active polling loop. The reconciliation job sweeps all transactions still in `PROCESSING` after a threshold period and queries the provider API in bulk to resolve them.

This system deliberately uses an **active retry polling loop** instead, as a conscious trade-off for the demo environment:

| Concern | Production pattern | This system |
|---|---|---|
| Primary status signal | Webhook (push) | Webhook (push) — same |
| Fallback for missed webhooks | Scheduled reconciliation job (hourly/nightly) | Active retry loop (30s → 60s → 120s) |
| Why the difference? | At scale, per-transaction polling exhausts provider rate limits | Demo scale is trivially small; rapid resolution is required for a live demo |
| Demo reliability | Reconciliation runs hourly — useless in a 10-minute demo slot | Payment resolves within 3.5 minutes even if ngrok drops the webhook |
| Demo surface area | Reconciliation job is invisible during a demo | Retry queue draining and DLQ are visibly demonstrable |

The retry loop **does not replace webhooks** — if a webhook arrives first, `RetryConsumer` detects the transaction is already resolved and skips silently (the `current != PENDING && current != PROCESSING` guard). The loop only acts when no webhook has arrived by the time the TTL fires.

In a production deployment, the active retry queue would be replaced with: (1) webhooks as the sole real-time signal, and (2) a `@Scheduled` reconciliation job querying the provider API once per hour for all unresolved transactions — consuming a single API call per batch rather than one call per transaction per retry tick.

**Disbursement note:** Xendit sandbox resolves disbursements synchronously — `POST /disbursements` returns `"status": "COMPLETED"` immediately. The adapter maps this to `SUCCESS` at initiation time, so no retry or webhook is ever needed for sandbox disbursement flows. This is consistent with real Xendit behaviour on certain fast-settlement rails.

### Feature 7: Routing Rule Simulate
A POST endpoint and matching UI panel where you input:
- Region, amount, currency, payment method
Returns:
- Which rule matched (or "no rule — scored automatically")
- Which provider was selected
- Provider score breakdown (success_rate contribution, fee contribution, latency contribution)
- Fallback provider
- Human-readable routing reason

### Feature 8: Post-Payment Notification Queue
After every successful payment, `PaymentService` publishes a `PaymentSucceededEvent` to a durable RabbitMQ queue (`payment.notification.queue`). Three call sites cover all success paths:

1. **Direct success** (Mock ALWAYS_SUCCESS) — published immediately after provider responds SUCCESS in `initiatePayment()`
2. **Webhook-resolved success** — published in `handleWebhook()` with a `previous != SUCCESS` guard to prevent double-publish if retry consumer already resolved it
3. **Retry-resolved success** — published by `RetryConsumer` after a polled status flip to SUCCESS

The `NotificationConsumer` processes each event and:
- Writes a `PREMIUM_ACTIVATED` or `CLAIM_DISBURSED` entry to `transaction_events`
- Locates the linked `demo_policy` record by `policy_number` (premium) or `claim_reference` (disbursement) and updates its status to `ACTIVATED` / `DISBURSED`
- Calls `EmailNotificationService.sendPaymentSuccessEmail()` with the updated policy — sends a branded HTML email to `demo_policies.holder_email` (see Feature 10)

The consumer is declared with `id = "notificationConsumer"` and `autoStartup = "true"`. At runtime, admin can call `POST /admin/notification-queue/consumer/stop` and `start` to toggle it. `GET /admin/notification-queue/status` returns `{ consumerActive, queueDepth }` polled every 3 seconds by the frontend Notification Queue Panel.

**Queue characteristics:** Durable, no TTL, no DLX. Messages survive broker restarts and consumer outages — they simply accumulate until the consumer comes back online.

**Demo moment:** Stop consumer → initiate 4–5 successful payments → watch queue depth climb in the panel → start consumer → depth drains to 0 in seconds → all policy rows turn green simultaneously.

### Feature 10: Customer Email Notifications

After `NotificationConsumer` activates or disburses a policy, it calls `EmailNotificationService` to send a branded HTML email directly to the policy holder.

**Two distinct email templates:**

| Payment Type | Subject | Key Content |
|---|---|---|
| `PREMIUM_COLLECTION` | `Payment Successful — [insuranceType] Policy [policyNumber] is Now Active` | holderName, amount, currency, policyNumber, insuranceType, provider, date |
| `CLAIMS_DISBURSEMENT` | `Claim Disbursement Processed — Reference [claimReference]` | holderName, amount, currency, claimReference, provider, date |

**Design:**
- Amber (#FCB900) header bar matching the admin dashboard brand
- Inline CSS only — compatible with all major email clients
- No Thymeleaf dependency — HTML built in Java string templates

**Resilience:**
- `JavaMailSender` injected with `@Autowired(required = false)` — app starts normally if SMTP is not configured; email is silently skipped with a `WARN` log
- `send()` call wrapped in try-catch — SMTP failure never throws out of `NotificationConsumer`, never causes a DB transaction rollback
- Payment success is already committed before email is attempted

**Dev SMTP:** Mailtrap sandbox (`sandbox.smtp.mailtrap.io:2525`) — all emails are caught in a web inbox, never reach real recipients. Credentials live in `application-dev.yml` (gitignored).

**Demo moment:** Trigger a payment in the Payment Demo page → open Mailtrap inbox → see the branded HTML email arrive within seconds with policy details.

---

### Feature 12: InsureStore — Customer-Facing Insurance Portal

A public-facing insurance storefront and checkout flow that demonstrates the routing engine from the *customer's* perspective. No login required. Accessible at `/buy`.

**Architecture principle:** InsureStore is a thin frontend layer on top of the same routing infrastructure used by the admin Payment Demo. The store controller (`InsureStoreController`) creates a `DemoPolicy` record and calls `PaymentService.initiatePayment()` — the same service, the same routing engine, the same provider adapters. The only difference is who initiates the payment (a customer vs an admin).

#### Store Page (`/buy`)

- **Sticky navbar:** brand, "Products" dropdown (category filter: All / Life / Medical / Motor / Travel / Accident), region `Select` (MY 🇲🇾 / ID 🇮🇩 / PH 🇵🇭), SSL badge
- **Hero section:** tagline, subtitle, 4 trust stats (50K+ policyholders, 99% uptime, 3 regions, 4 providers)
- **Product cards:** category icon in tinted circle, badge (e.g. "Most Popular"), name, tagline, amber coverage highlight (first feature), bullet list of remaining features, "Starting from [amount]" with "Get Started →" button
- **Trust band:** "Fast Claims", "Regulatory Compliant", "Bank-Grade Security" columns; regulatory badge switches per region (BNM/OJK/IC)
- **Dark footer:** brand, nav links, license and regulatory disclaimer text
- Products fetched from DB (`store_products` table); region change refreshes the product list via TanStack Query with `queryKey: ['store-products', region]`

#### Checkout Wizard (`/buy/checkout`)

A 4-step form that collects everything needed to issue a quote. Steps are gated — "Continue" only activates when the current step validates.

| Step | Title | Key fields |
|---|---|---|
| 1 | Personal Information | Full name, national ID (NRIC/NIK/PhilSys depending on region), DOB (auto-parsed from NRIC for MY), gender (auto-detected from NRIC last digit for MY), phone, email, occupation, marital status |
| 2 | Coverage Details | Product-specific fields per insurance type: life (sum insured, smoker, beneficiary), medical (pre-existing conditions, height/weight), motor (vehicle reg, make, model, year, engine CC, NCD), travel (destination, dates, passport, travellers), accident (occupational class, PA sum insured) |
| 3 | Declaration & Disclosure | 4 checkboxes (all required); text varies by region — Malaysian applications cite BNM FSA 2013, Indonesian cite OJK UU 40/2014, Philippine cite IC PD 1460 |
| 4 | Review & Quote | Application summary, selected payment method (options vary by region), "Get My Quote — Email Payment Link" button |

**NRIC auto-parse (Malaysia only):** Format `YYMMDD-PB-XXXG` — date of birth extracted from first 6 digits (year disambiguation: `≤ 25 → 2000+YY, > 25 → 1900+YY`), gender from last digit (even = Female, odd = Male). Auto-fills DOB and gender pills below the input as the user types.

**Payment methods by region:**

| Region | Methods |
|---|---|
| MY | FPX (Online Banking), E-Wallet |
| ID | Virtual Account, QRIS, GoPay |
| PH | GCash, Maya, GrabPay |

#### Quote-Based Payment Flow

The quote flow decouples form submission from payment initiation. This is the industry-standard approach used by Etiqa, Prudential MY, and Great Eastern: the application is saved as a quote before any money moves.

```
Customer fills wizard → clicks "Get My Quote"
    ↓
POST /store/quote
    → DemoPolicy saved (status = QUOTE, transactionId = null)
    → Quote email sent to customer
    → Returns { policyId, quoteReference }
    ↓
"Check Your Email" confirmation screen (no payment provider redirect)
    → Shows quote reference (e.g. POL-MY-1234567)
    → "Quote valid for 7 days" notice
    → Back to Plans button

Customer opens email → clicks "Complete Payment →"
    ↓
/complete-payment?policyId=UUID
    → GET /store/result?policyId=UUID → fetches quote details (status = QUOTE)
    → Shows: policyholder name, plan, payment method, premium amount
    → Single "Pay [amount]" button
    ↓
POST /store/pay { policyId, redirectUrl }
    ┌─ QUOTE status ──────────────────────────────────────────────────────────────┐
    │  → Routing engine selects provider by region (Billplz/Midtrans/Xendit)      │
    │  → PaymentService creates transaction, links it to policy                   │
    │  → DemoPolicy status → PENDING (set by PaymentService on PENDING/PROCESSING)│
    │  → Returns provider redirect URL                                             │
    └─────────────────────────────────────────────────────────────────────────────┘
    ┌─ PENDING status (re-open email link / back from provider page) ─────────────┐
    │  → Fetches existing transaction by policy.transactionId                     │
    │  → Returns existing transaction.redirectUrl (no new transaction created)    │
    └─────────────────────────────────────────────────────────────────────────────┘
    ┌─ FAILED / RETRY_EXHAUSTED status ───────────────────────────────────────────┐
    │  → Allows re-initiation; generates a fresh merchantOrderId suffix (-R####)  │
    │  → to avoid provider order_id conflicts on retry                            │
    └─────────────────────────────────────────────────────────────────────────────┘
    ┌─ ACTIVATED / DISBURSED status ──────────────────────────────────────────────┐
    │  → HTTP 409 Conflict — "This policy has already been paid."                 │
    └─────────────────────────────────────────────────────────────────────────────┘
    ↓
Customer redirected to provider's hosted payment page
    ↓
Provider redirects to /payment-result?policyId=UUID
    → GET /store/result?policyId=UUID → fetches transaction + policy
    → Shows: status (SUCCESS/PENDING/FAILED), policy number, provider, routing strategy, fee
```

**`policyId` propagation:** `appendPolicyId()` appends `?policyId=UUID` to the `redirectUrl` before it is sent to the provider. All three providers (Billplz, Midtrans, Xendit) preserve existing query params when constructing their redirect callback URL, so `policyId` is always present on the return leg.

**Payment resumption (idempotent re-send):** If the customer closes the browser mid-payment and re-opens the email link, `POST /store/pay` detects `status = PENDING` and returns the *existing* provider URL — the same Billplz bill URL / Midtrans Snap redirect / Xendit invoice URL created during the original request. No new transaction is created. This matches the approach endorsed by Midtrans documentation ("store the Snap token and redirect_url associated with your Order ID so you can re-present it") and is consistent with Xendit's invoice model (invoice URL valid for 24 hours, re-presentable). The `/complete-payment` page renders a **"Resume Payment"** button for PENDING state that calls `POST /store/pay` and navigates to the returned URL.

**Retry after failure:** If the provider rejects the payment (DemoPolicy status → FAILED), re-opening the payment link shows the quote summary with a red "Previous payment attempt failed" banner and a fresh Pay button. `POST /store/pay` is allowed for FAILED/RETRY_EXHAUSTED policies — it generates a new `merchantOrderId` with a `-R####` suffix to avoid provider order_id conflicts on the retry attempt.

**Double-charge prevention (layered defence):**
1. `PaymentService` guard blocks `DuplicatePaymentException` for ACTIVATED/DISBURSED — the final hard stop
2. `InsureStoreController.pay()` returns the existing URL for PENDING — never creates a second transaction
3. Frontend ACTIVATED/DISBURSED detection redirects to `/payment-result` immediately, bypassing the Pay button entirely

#### Database — Product Catalogue

```
store_products
  id              UUID PK
  code            VARCHAR(30) UNIQUE      -- e.g. "life_my", "medical_id", "travel_ph"
  name            VARCHAR(100)
  insurance_type  VARCHAR(60)             -- Life / Medical / Motor / Travel / Accident
  tagline         VARCHAR(200)
  amount          DECIMAL(10,2)
  billing_period  VARCHAR(20)             -- "Monthly" / "Annual"
  features        TEXT                    -- pipe-separated, e.g. "Feature A|Feature B|Feature C"
  badge           VARCHAR(50)             -- "Most Popular" / "Best Value" / null
  sort_order      INT
  active          BOOLEAN DEFAULT true
  region          VARCHAR(2)              -- MY / ID / PH
  currency        VARCHAR(3)              -- MYR / IDR / PHP
```

Features are stored as a pipe-separated string and split by `StoreProductResponse.from()` at serialization time. No join table or JSONB needed.

#### API Endpoints — Store (Public, No Auth)

| Method | Path | Description |
|---|---|---|
| GET | `/store/products?region=MY` | List active products for region, ordered by `sort_order` |
| POST | `/store/quote` | Save application as quote; send email; return `{ policyId, quoteReference }` |
| POST | `/store/pay` | Initiate payment for existing quote; return provider redirect URL |
| GET | `/store/result?policyId=UUID` | Get result for any policy state (QUOTE/PENDING/SUCCESS/FAILED) |

**Quote Request:**
```json
{
  "holderName": "Ahmad bin Yusof",
  "holderEmail": "ahmad@example.com",
  "insuranceType": "Life",
  "amount": 99.00,
  "paymentMethod": "FPX",
  "region": "MY",
  "currency": "MYR",
  "appBaseUrl": "http://localhost:5173"
}
```

**Pay Request:**
```json
{
  "policyId": "uuid-of-quote",
  "redirectUrl": "http://localhost:5173/payment-result"
}
```

**Result Response (QUOTE state — no transaction yet):**
```json
{
  "transactionId": null,
  "status": "QUOTE",
  "provider": null,
  "routingStrategy": null,
  "routingReason": null,
  "fee": null,
  "amount": 99.00,
  "currency": "MYR",
  "policyNumber": "POL-MY-1234567",
  "holderName": "Ahmad bin Yusof",
  "holderEmail": "ahmad@example.com",
  "insuranceType": "Life",
  "paymentMethod": "FPX",
  "createdAt": "2026-05-27T10:00:00Z"
}
```

**Result Response (SUCCESS state — after payment):**
```json
{
  "transactionId": "txn-uuid",
  "status": "SUCCESS",
  "provider": "BILLPLZ",
  "routingStrategy": "LOWEST_FEE",
  "routingReason": "Rule #2 (priority=2): PREMIUM_COLLECTION → LOWEST_FEE strategy selected Billplz",
  "fee": 0.30,
  "amount": 99.00,
  "currency": "MYR",
  "policyNumber": "POL-MY-1234567",
  "holderName": "Ahmad bin Yusof",
  "holderEmail": "ahmad@example.com",
  "insuranceType": "Life",
  "paymentMethod": "FPX",
  "createdAt": "2026-05-27T10:00:00Z"
}
```

#### Demo Policy Status Lifecycle (InsureStore)

```
QUOTE           payment not yet initiated; customer received email, has not clicked "Pay"
  │
  │ POST /store/pay (first call)
  ▼
PENDING         payment initiated at provider; waiting for webhook callback
  │               └─ re-open email link → POST /store/pay returns existing provider URL
  │                  (no new transaction; same URL presented to customer)
  ├─ webhook SUCCESS ──────────────────────────────────────────────────────────────┐
  │                                                                                │
  ▼                                                                                │
ACTIVATED       premium collected; policy active (set by NotificationConsumer)    │
                                                                                   │
  ├─ webhook FAILED / retry exhausted ─────────────────────────────────────────┐  │
  │                                                                             │  │
  ▼                                                                             │  │
FAILED          payment rejected; customer can retry via same email link        │  │
  │             (retry generates new merchantOrderId suffix to avoid            │  │
  │              provider order_id conflicts)                                   │  │
  │                                                                             │  │
  └─ POST /store/pay (retry) ────────────────────────────────────────────────▶ PENDING (new transaction)
```

| Status | `POST /store/pay` behaviour | Frontend |
|---|---|---|
| `QUOTE` | Initiate payment; create transaction | Pay button |
| `PENDING` | Return existing provider checkout URL | "Resume Payment" button |
| `FAILED` / `RETRY_EXHAUSTED` | Re-initiate with new merchantOrderId | Pay button + red retry banner |
| `ACTIVATED` / `DISBURSED` | HTTP 409 — already paid | Auto-redirect to `/payment-result` |

---

### Feature 13: Customer Policy Status Dashboard

A public, self-service status page at `/store/policy/:policyId` that shows a policyholder everything about their purchase — policy details, payment routing decision, and a full event timeline — without requiring any login.

**Access model:** The `policyId` UUID is embedded in every email (quote, success, failure). It acts as an implicit access token — 122 bits of entropy make it non-enumerable. A lookup form at `/store/policy` provides a fallback: the customer enters their registered email + policy number, which are verified against the DB, then redirected to the UUID URL.

#### Routes

| Path | Component | Purpose |
|---|---|---|
| `/store/policy` | `PolicyLookupPage` | Lookup form — email + policy number → redirects to UUID URL |
| `/store/policy/:policyId` | `PolicyStatusPage` | Full status detail — 3 cards + action buttons |

#### Three-Card Page Layout

**Card 1 — Policy Details** (always shown)
- Grid: policyholder name, email, insurance plan, premium amount + currency, region, payment method, applied-on date

**Card 2 — Payment Details** (only when a transaction exists)
- Provider, routing strategy (human-readable), routing reason (full text), fee charged, transaction ID (monospace)

**Card 3 — Activity Timeline** (only when events exist)
- antd `<Timeline>` component; each row: colored dot + human-readable event type + description + UTC timestamp
- Dot colors: green (success/activated), red (failed/exhausted), amber (retry/delayed), blue (initiated/selected), purple (webhook)

#### Status Badge

| Policy Status | Badge Label | Color |
|---|---|---|
| `ACTIVATED` | Active | Green (#DCFCE7 / #166534) |
| `DISBURSED` | Disbursed | Green |
| `PENDING` / `PROCESSING` | Pending | Amber — spinning icon; page auto-refreshes every 5 s |
| `QUOTE` | Not Paid | Grey |
| `FAILED` | Failed | Red (#FEE2E2 / #991B1B) |
| `RETRY_EXHAUSTED` | Retries Exhausted | Red |

#### Action Buttons (Conditional)

- `FAILED` or `RETRY_EXHAUSTED` → amber **"Retry Payment →"** button → navigates to `/store/complete?policyId=xxx` — the same flow as the failure email retry link; `POST /store/pay` handles re-initiation with a fresh `merchantOrderId`
- Always → **"Browse Plans"** → `/store`

#### Backend — Two New Public Endpoints

Both fall under `/api/v1/store/**` which is already `permitAll()` in `SecurityConfig`.

| Method | Path | Description |
|---|---|---|
| GET | `/store/policy/lookup?email=&policyNumber=` | Verify ownership; return `{ policyId: UUID }` |
| GET | `/store/policy/{policyId}` | Full status + event timeline via `PolicyStatusResponse` |

Spring MVC resolves literal `/policy/lookup` before the parameterized `/policy/{policyId}` — no routing conflict.

**`PolicyStatusResponse` DTO:**
```json
{
  "policyId": "uuid",
  "policyNumber": "POL-MY-1234567",
  "holderName": "Ahmad bin Yusof",
  "holderEmail": "ahmad@example.com",
  "insuranceType": "Life",
  "amount": 99.00,
  "currency": "MYR",
  "region": "MY",
  "paymentMethod": "FPX",
  "paymentType": "PREMIUM_COLLECTION",
  "status": "ACTIVATED",
  "transactionId": "txn-uuid",
  "provider": "BILLPLZ",
  "routingStrategy": "LOWEST_FEE",
  "routingReason": "Rule #2 (priority=2): PREMIUM_COLLECTION → LOWEST_FEE",
  "fee": 0.30,
  "createdAt": "2026-06-10T10:00:00Z",
  "events": [
    { "eventType": "PAYMENT_INITIATED", "description": "Payment initiated via Billplz", "createdAt": "..." },
    { "eventType": "WEBHOOK_RECEIVED",  "description": "Webhook received from Billplz: PAID", "createdAt": "..." },
    { "eventType": "PREMIUM_ACTIVATED", "description": "Policy activated after successful payment", "createdAt": "..." }
  ]
}
```

#### Email Integration

| Email | Change |
|---|---|
| Success (`PREMIUM_COLLECTION`) | "View Policy Status →" button added below the payment details table |
| Failure (premium) | "View policy status online" text link added below the existing "Retry Payment →" button |
| Quote email | No link — policy status is not meaningful before payment is attempted |

#### Frontend Files (FeeRates pattern — TSX + module.css in separate files)

```
features/policy-status/
  PolicyLookupPage.tsx
  PolicyLookupPage.module.css
  PolicyStatusPage.tsx
  PolicyStatusPage.module.css
  hooks/
    usePolicyStatus.ts          (usePolicyStatus with 5s auto-refresh + usePolicyLookup mutation)
  services/
    policyStatusService.ts
```

**Demo moment:** Success email arrives → click "View Policy Status →" → full 3-card layout: policy details, Billplz routing decision, and event timeline with every step timestamped. Switch to failure scenario → "Retries Exhausted" badge → red timeline → click "Retry Payment →" → back to checkout with same policy pre-loaded.

---

### Feature 14: Reconciliation Settlement Import

The reconciliation module closes the financial audit loop by comparing what the system *expected* to pay providers against what providers *actually* charged, using real settlement files.

#### Why Excel Import (Not Auto-Generate)

The `expected_fee` is already snapshotted on every transaction at initiation time (`transactions.fee`), so there is always an internal record of what we predicted. The missing piece is the *actual* fee from the provider's perspective — which is only available via the provider's settlement file (downloaded from their portal at end of day). Because each real provider (Billplz, Midtrans, Xendit) has a different proprietary export format, the system uses a single **standardized import template** that the admin fills in — eliminating the need for 3 separate parser implementations while keeping the reconciliation flow realistic.

**Key temporal correctness guarantee:** `expected_fee` is read from `transactions.fee`, not from the live `provider_fee_rates` table. This means reconciliation is immune to fee rate changes — if an admin updates a rate today, yesterday's recon statements still compare against the fee that was active when each transaction was created.

#### Import Flow

```
Admin clicks "Download Template"
  → GET /api/v1/admin/recon/template
  → Backend queries transactions WHERE no recon_statement exists yet AND fee IS NOT NULL
  → Returns XLSX pre-filled with: merchant_order_id, provider, payment_method, amount,
    expected_fee, settlement_date — actual_fee column intentionally blank
  → Up to 50 most recent unreconciled transactions

Admin fills in actual_fee column from provider settlement portal
  → One deliberate discrepancy added for demo purposes

Admin uploads completed file
  → POST /api/v1/admin/recon/import (multipart/form-data, Content-Type: xlsx)
  → Per row:
      - Read merchant_order_id + actual_fee
      - Skip if actual_fee blank (rowsNoFee counter)
      - Lookup Transaction by merchant_order_id → skip if not found (rowsUnmatched)
      - Skip if recon_statement already exists for this transaction (rowsSkipped — safe re-upload)
      - expected_fee = transaction.fee  (historical snapshot, immune to rate changes)
      - variance = actual_fee − expected_fee
      - variance_pct = variance / expected_fee
      - anomaly = |variance_pct × 100| > threshold (default 5%, configurable)
      - Build ReconStatement, add to batch
  → Bulk-insert all matched rows (@Transactional — all or nothing)
  → Return ReconImportResult
```

#### Import Result Summary

```json
{
  "rowsProcessed": 10,
  "rowsMatched": 9,
  "rowsNoFee": 0,
  "rowsUnmatched": 1,
  "rowsSkipped": 0,
  "anomaliesFound": 1
}
```

Displayed in a modal after upload with color-coded badges per field.

#### Aggregate KPI Strip

The three summary cards at the top of the Reconciliation page now read from `GET /api/v1/admin/recon/summary` (real DB aggregates) rather than counting the current page only:

| Card | Value |
|---|---|
| Total Statements | `COUNT(*)` across all `recon_statements` |
| Total Anomalies | `COUNT(*) WHERE is_anomaly = true` |
| Total Variance | `SUM(ABS(variance)) WHERE variance IS NOT NULL` |

#### Configuration

```yaml
# application.yml
recon:
  anomaly-threshold-pct: 5.0   # flag as anomaly if |variance_pct| > this value (percent)
```

#### Backend Components

| Component | Module | Purpose |
|---|---|---|
| `ReconImportService` | pos-admin | Excel parsing (Apache POI), transaction matching, variance computation, template generation |
| `ReconImportResult` | pos-admin (DTO) | Import summary: processed, matched, noFee, unmatched, skipped, anomaliesFound |
| `ReconSummaryDto` | pos-admin (DTO) | Aggregate KPIs: totalStatements, totalAnomalies, totalVariance |
| `ReconStatementController` | pos-admin | 3 new endpoints: POST /import, GET /summary, GET /template |

New repository methods:
- `ReconStatementRepository.existsByTransactionId(UUID)` — duplicate check
- `ReconStatementRepository.countByAnomalyTrue()` — summary KPI
- `ReconStatementRepository.sumAbsVariance()` — summary KPI
- `ReconStatementRepository.findUnreconciledTransactions(Pageable)` — template pre-fill
- `TransactionRepository.findByMerchantOrderId(String)` — row matching

**Dependency added:** `org.apache.poi:poi-ooxml:5.3.0` in `pos-admin/pom.xml`.

#### Frontend Components

| File | Change |
|---|---|
| `Reconciliation.tsx` | Upload dragger + Download Template button + import result Modal + real aggregate KPI strip |
| `reconService.ts` | `importFile(File)` + `getSummary()` methods added |
| `useReconSummary.ts` | New hook — fetches `/recon/summary`, invalidated after import |
| `recon.ts` | `ReconImportResult` + `ReconSummary` interfaces added |
| `endpoints.ts` | `RECON.IMPORT`, `RECON.SUMMARY`, `RECON.TEMPLATE` added |

**Demo moment:** Admin clicks "Download Template" → Excel opens with real transaction rows pre-filled, `actual_fee` column blank → admin types in fees, changes one row to an incorrect value → uploads → modal shows "9 matched, 1 anomaly found" → table refreshes with anomaly row highlighted in red → KPI strip updates live.

---

### Feature 11: Routing Engine Page

A dedicated admin page (`/routing`) that makes the scoring algorithm fully transparent — both as a static reference and as a live simulator. Moved out of the Dashboard so it gets the full page width it deserves and is discoverable via the sidebar.

**Section 1 — Composite Score Formula (always visible, no interaction needed)**

Four weight cards showing exactly how the composite score is assembled:

| Factor | Weight | What it measures |
|---|---|---|
| Success Rate | 40% | Historical payment approval rate for this provider in the selected region. Defaults to 50% when no recent `provider_metrics` rows exist. |
| Fee Score | 25% | Inverse of the normalized fee relative to other eligible providers. Lower fee = higher score. |
| Latency | 15% | Inverse of the normalized average response time. Faster = higher score. |
| Fee Accuracy | 20% | Match between quoted fees and actual fees from `recon_statements`. High accuracy = provider is predictable. |

A monospace formula bar shows the equation:
```
score = (successRate × 0.40) + ((1 − normFee) × 0.25) + ((1 − normLatency) × 0.15) + (feeAccuracy × 0.20)
```
A note clarifies that weights are configurable in `application.yml → routing.scorer.*`.

**Section 2 — Simulation Form**

Input fields:
- Region (MY / ID / PH)
- Payment Type (`PREMIUM_COLLECTION` / `CLAIMS_DISBURSEMENT`) — selecting Claims Disbursement will filter out Billplz and Midtrans to demonstrate the provider capability check
- Amount (with currency auto-determined per region)
- Currency (read-only, derived from region)

**Section 3 — Provider Score Breakdown**

After running a simulation, each eligible provider is shown as a card:
- Total composite score (0–100) with a progress bar; winner highlighted in amber
- Four sub-score rows, each showing: raw input value → weighted component score → weight multiplier
  - e.g. `Success Rate  87% → 0.35  ×0.40`
- Providers excluded by the payment type capability filter are listed below with the reason (e.g. "Billplz — Does not support CLAIMS_DISBURSEMENT (collection-only provider)")

**Section 4 — Strategy Comparison**

A table showing what each of the 4 strategies would select for the same input:

| Strategy | What it does |
|---|---|
| Region-Based Override | Follows the highest-priority routing rule with a `preferred_provider` set |
| Lowest Fee Optimizer | Picks the provider with the lowest calculated fee for this amount/method |
| Success Rate Focus | Picks the provider with the highest historical approval rate in this region |
| Smart Composite Score | Applies the weighted formula — the default production strategy |

**Backend endpoints used:**

| Endpoint | Description |
|---|---|
| `GET /admin/dashboard/scores?region=MY&amount=500&currency=MYR&paymentType=CLAIMS_DISBURSEMENT` | Returns `ScoreDetail[]` for eligible providers only, sorted best-to-worst |
| `GET /admin/dashboard/strategy-comparison?...&paymentType=CLAIMS_DISBURSEMENT` | Returns which provider each strategy would select |

Both endpoints filter eligible providers by `paymentType` using the `supportedPaymentTypes()` capability method on each adapter.

**Demo moment:** Select MY + CLAIMS_DISBURSEMENT → Billplz disappears from the eligible list, only Mock appears with full score breakdown. Switch to PH + CLAIMS_DISBURSEMENT → Xendit appears alongside Mock, both with real scores. This shows the examiner that the engine is not just region-aware but payment-type-aware.

---

### Feature 9: Insurance Payment Demo
The `/payment-demo` page is a simulated insurance back-office system, not just a raw payment form.

**Policy table:** Admin-managed records from the `demo_policies` table. Two tabs:
- **Premium Collection** — policyholder records with region, amount, policy number, status
- **Claims Disbursement** — claim records with claim reference, region, amount, status

**Pay button flow:**
1. Admin clicks Pay on a pending row
2. Form below the table is pre-filled (region, amount, currency, policy number / claim reference are read-only)
3. Form submits → `Idempotency-Key` UUID generated → `POST /payments/initiate`
4. On success: provider's payment page auto-opens in a new tab (non-localhost URLs); result card shows routing decision + "Open Payment Page" button
5. Policy row status flips to ACTIVATED/DISBURSED via optimistic cache update (no page refresh needed); then confirmed from DB via `refetchInterval: 4000`

**Duplicate prevention:**
- Pay button is added to `submittedIds` set the moment the form submits — before the API responds
- Button stays disabled as long as the policy is not PENDING or is in `submittedIds`
- On API error: policy removed from `submittedIds` so the user can retry
- Mutation variables carry the `policy` object to avoid React closure staleness in `onSuccess`/`onError`

---

## 8. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 21 | Language |
| Spring Boot | 3.x | Framework |
| Spring Security | 6.x | Auth |
| Spring Data JPA | 3.x | ORM |
| RabbitMQ | 3.x | Message broker (webhook queue + retry queue + DLQ) |
| Spring AMQP | 3.x | RabbitMQ integration (`@RabbitListener`, `RabbitTemplate`) |
| Maven | 3.9+ | Build / multi-module |
| PostgreSQL | 15+ | Primary database |
| Flyway | 9.x | Database migrations |
| Lombok | latest | Boilerplate reduction |
| MapStruct | 1.5+ | DTO↔Entity mapping |
| JJWT | 0.12+ | JWT creation/validation |
| Springdoc OpenAPI | 2.x | Swagger UI |
| Testcontainers | 1.19+ | Integration tests with real PostgreSQL |
| Spring Mail | (via Spring Boot starter) | Transactional HTML email via SMTP (Mailtrap in dev) |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | SPA framework |
| TypeScript | 5.x | Language |
| Vite | latest | Build tool |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Server state / data fetching |
| Axios | latest | HTTP client (JWT interceptor) |
| Ant Design (antd) | 5.x | UI component library |
| Recharts | latest | Charts (volume, provider breakdown) |

### Provider Sandbox Accounts
| Provider | Region | Methods | Disbursement | Sandbox |
|---|---|---|---|---|
| Billplz | Malaysia | FPX bank transfer | ❌ | Free, no registration required |
| Midtrans | Indonesia | Virtual Account (BCA), QRIS, GoPay, Card (Snap API) | ❌ | Free sandbox at midtrans.com; card payments use Snap hosted page |
| Xendit | Philippines | GCash, Maya, GrabPay, Card (Invoice API); Bank disbursement (Disbursements API) | ✅ | Free, globally accessible at dashboard.xendit.co |
| Mock | All | Configurable | ✅ | Built-in, no external account |

### Dev Tools
- Docker Compose — PostgreSQL + RabbitMQ local instances
- RabbitMQ Management UI — built-in at `http://localhost:15672` (queue depths, message rates, DLQ inspection)
- ngrok — expose localhost for sandbox webhooks
- Postman — API testing collection

---

## 9. Security & Configuration

### Authentication
- Login → Spring Security validates credentials → returns short-lived JWT access token (15 min) + long-lived refresh token (7 days)
- Refresh token stored in `users` table (server-side invalidation on logout)
- All `/api/v1/admin/**` endpoints require `ADMIN` or `VIEWER` role
- All `/api/v1/payments/**` endpoints require `MERCHANT` role or `ADMIN`
- All `/api/v1/webhooks/**` endpoints are public but HMAC-verified at the application layer

### Idempotency
- Client sends `Idempotency-Key: <uuid>` header with every POST to `/payments/initiate`
- `IdempotencyFilter` checks `idempotency_records` table before request reaches service
- If key exists and request hash matches: return cached response (200)
- If key exists but hash differs: return 422 (different request, same key)
- Records expire after 24 hours (cleanup job runs nightly)

### Webhook Security
- Each provider has a `webhook_secret` stored in `provider_configs`
- Verification is HMAC-SHA256 for Billplz and Midtrans; static `x-callback-token` header comparison for Xendit (configured in Xendit dashboard → Settings → Callbacks)
- Mock provider always passes verification
- All inbound webhooks logged to `webhook_logs` with `signature_valid` flag — even failed verifications are logged
- Xendit webhook endpoint: `POST /api/v1/webhooks/XENDIT` — handled by the same generic `WebhookController` that routes by provider path variable

### Environment Configuration
```yaml
# application.yml (non-sensitive)
routing:
  scorer:
    success-rate-weight: 0.40
    fee-weight: 0.25
    latency-weight: 0.15
    fee-accuracy-weight: 0.20
  metrics:
    window-minutes: 60          # 60-min window suits demo-scale volume; production would use 5 min
    refresh-interval-minutes: 15 # aggregation tick; production would run every 1 min at scale

notification:
  email:
    from: noreply@paymentorchestration.com

recon:
  anomaly-threshold-pct: 5.0   # flag recon row as anomaly if |variance %| exceeds this

# application-dev.yml (dev secrets — gitignored)
spring.datasource.url: jdbc:postgresql://localhost:5432/pos_dev
jwt.secret: <dev-secret>
providers:
  billplz.api-key: <sandbox-key>
  midtrans.server-key: <sandbox-key>
  xendit:
    secret-key: xnd_development_XXXXXXXXXXXXXXXXXXXXXXXX   # dashboard.xendit.co → Settings → API Keys
    webhook-token: <any-string-you-set-in-xendit-dashboard> # Settings → Configuration → Callback Token
  mock.default-mode: ALWAYS_SUCCESS

# Mailtrap sandbox SMTP (from mailtrap.io → Email Testing → SMTP Settings)
spring.mail:
  host: sandbox.smtp.mailtrap.io
  port: 2525
  username: <mailtrap-username>
  password: <mailtrap-password>
  properties.mail.smtp.auth: true
  properties.mail.smtp.starttls.enable: true
```

### Security Scope
- ✅ JWT authentication and role-based authorization
- ✅ HMAC webhook signature verification
- ✅ SQL injection prevention (parameterized queries via JPA)
- ✅ Sensitive config externalized (never hardcoded)
- ❌ PCI DSS compliance (out of scope — no real card data)
- ❌ Rate limiting (out of scope for MVP)
- ❌ DDoS protection (out of scope)

---

## 10. API Specification

Base URL: `/api/v1`

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Returns access + refresh token |
| POST | `/auth/refresh` | Public | Rotates access token |
| POST | `/auth/logout` | Bearer | Invalidates refresh token |
| GET | `/auth/me` | Bearer | Current user profile |

### Payments
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/initiate` | Bearer | Initiate + route payment. Requires `Idempotency-Key` header. |
| GET | `/payments/{id}/status` | Bearer | Poll transaction status |
| POST | `/payments/{id}/refund` | Bearer | Initiate refund |
| GET | `/payments/{id}/events` | Bearer | Full event timeline |

**Initiate Payment Request:**
```json
{
  "policyId": "uuid-of-demo-policy",
  "merchantOrderId": "ORDER-001",
  "policyNumber": "POL-2026-MY-00123",
  "claimReference": null,
  "paymentType": "PREMIUM_COLLECTION",
  "amount": 50.00,
  "currency": "MYR",
  "region": "MY",
  "customerEmail": "user@example.com",
  "description": "Monthly premium — Policy POL-2026-MY-00123",
  "redirectUrl": "https://insurer.com/payment/result",
  "metadata": { "policyType": "life", "coveragePeriod": "2026-04" }
}
```

**Initiate Payment Response:**
```json
{
  "transactionId": "txn_uuid",
  "status": "PENDING",
  "provider": "BILLPLZ",
  "paymentType": "PREMIUM_COLLECTION",
  "policyNumber": "POL-2026-MY-00123",
  "routingReason": "Rule #2 matched: MY region, amount < RM100",
  "redirectUrl": "https://billplz.com/bills/abc123",
  "vaNumber": null,
  "fee": 0.30,
  "createdAt": "2026-03-30T10:00:00Z"
}
```

`vaNumber` is only populated for Midtrans `VIRTUAL_ACCOUNT` payments (e.g. `"vaNumber": "12345678901234"`). It is `null` for all other providers and payment methods. When `vaNumber` is present, `redirectUrl` will be `null` — the customer makes a bank transfer to the VA number instead of being redirected.

**Response field summary by Midtrans payment method:**

| Method | `status` | `redirectUrl` | `vaNumber` |
|---|---|---|---|
| `VIRTUAL_ACCOUNT` | `PROCESSING` | `null` | BCA VA number string |
| `CARD` (Snap) | `PENDING` | Snap hosted page URL | `null` |
| `QRIS` | `PROCESSING` | QR code image URL | `null` |
| `GOPAY` / `EWALLET` | `PROCESSING` | GoPay deep-link URL | `null` |

### Payments — Disbursement (Claims Payout)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/disburse` | Bearer | Initiate outbound claim payout. Requires `Idempotency-Key` header. `paymentType` defaults to `CLAIM_PAYOUT`. |

Request mirrors `/payments/initiate` with `claimReference` (required) and `policyNumber` (optional). `paymentType` is automatically set to `CLAIM_PAYOUT`.

### Webhooks (No JWT — signature verified per provider)
| Method | Path | Verification |
|---|---|---|
| POST | `/webhooks/BILLPLZ` | HMAC-SHA256 |
| POST | `/webhooks/MIDTRANS` | HMAC-SHA256 |
| POST | `/webhooks/XENDIT` | `x-callback-token` header |
| POST | `/webhooks/MOCK` | Always passes |

### Admin — Transactions
| Method | Path | Description |
|---|---|---|
| GET | `/admin/transactions` | Filter: status, provider, region, currency, paymentType, dateFrom, dateTo, page, size |
| GET | `/admin/transactions/{id}` | Detail + event timeline |
| GET | `/admin/transactions/export` | CSV export |

### Admin — Routing Rules
| Method | Path | Description |
|---|---|---|
| GET/POST | `/admin/routing-rules` | List all / Create new |
| GET/PUT/DELETE | `/admin/routing-rules/{id}` | Single rule CRUD |
| PATCH | `/admin/routing-rules/{id}/toggle` | Enable/disable without full edit |
| POST | `/admin/routing-rules/reorder` | Bulk priority update |
| POST | `/admin/routing-rules/simulate` | Test hypothetical payment against rules |

**Simulate Request/Response:**
```json
// Request
{ "region": "ID", "amount": 100000, "currency": "IDR", "method": "VIRTUAL_ACCOUNT" }

// Response
{
  "selectedProvider": "MIDTRANS",
  "matchedRule": null,
  "strategy": "COMPOSITE_SCORE",
  "reason": "No rule matched. Midtrans scored highest: success_rate=0.96, fee=0.015, latency=340ms",
  "scoreBreakdown": {
    "MIDTRANS": { "total": 0.89, "successRateScore": 0.48, "feeScore": 0.27, "latencyScore": 0.14 },
    "MOCK":     { "total": 0.50, "successRateScore": 0.25, "feeScore": 0.15, "latencyScore": 0.10 }
  },
  "fallbackProvider": "MOCK"
}
```

### Admin — Providers
| Method | Path | Description |
|---|---|---|
| GET | `/admin/providers` | List all with current status |
| GET/PUT | `/admin/providers/{provider}` | Get / update config |
| PATCH | `/admin/providers/{provider}/toggle` | Enable/disable |
| GET | `/admin/providers/{provider}/metrics` | Success rate, fees, latency. `?period=1h,24h,7d` |
| GET | `/admin/providers/{provider}/health` | Live health check |

### Admin — Dashboard
| Method | Path |
|---|---|
| GET | `/admin/dashboard/summary` |
| GET | `/admin/dashboard/volume-chart?granularity=hour` |
| GET | `/admin/dashboard/provider-breakdown` |
| GET | `/admin/dashboard/region-breakdown` |
| GET | `/admin/dashboard/recent-failures` |

### Admin — Fee Rates
| Method | Path | Description |
|---|---|---|
| GET | `/admin/fee-rates` | List all rows ordered by provider → region → payment method |
| POST | `/admin/fee-rates` | Create a new fee rate row. Currency auto-derived from region (MY→MYR, ID→IDR, PH→PHP). Returns 409 if provider/region/method combination already exists. |
| PUT | `/admin/fee-rates/{id}` | Update fixed amount and/or percentage on an existing row |
| DELETE | `/admin/fee-rates/{id}` | Delete a fee rate row. Returns 404 if not found. |

**Create Fee Rate Request:**
```json
{
  "provider": "BILLPLZ",
  "region": "MY",
  "paymentMethod": "FPX",
  "feeType": "FIXED_PLUS_PERCENTAGE",
  "fixedAmount": 0.50,
  "percentage": 0.008,
  "active": true
}
```

### Admin — Demo Policies
| Method | Path | Description |
|---|---|---|
| GET | `/admin/demo-policies` | List all demo policies ordered by created_at asc |
| POST | `/admin/demo-policies` | Create a new policy or claim record for the demo |
| DELETE | `/admin/demo-policies/{id}` | Delete a demo policy record |

**Create Demo Policy Request:**
```json
{
  "holderName": "Ahmad bin Yusof",
  "holderEmail": "ahmad@example.com",
  "insuranceType": "Life",
  "policyNumber": "POL-2026-MY-00101",
  "claimReference": null,
  "amount": 120.00,
  "currency": "MYR",
  "region": "MY",
  "paymentMethod": "FPX",
  "paymentType": "PREMIUM_COLLECTION"
}
```

**Demo Policy Status values:** `PENDING` → `ACTIVATED` (premium) or `DISBURSED` (claim disbursement)

### Store (Public — No JWT required)
| Method | Path | Description |
|---|---|---|
| GET | `/store/products?region=MY` | List active products for the given region, ordered by `sort_order` |
| POST | `/store/quote` | Save application as quote; email payment link to customer; return `{ policyId, quoteReference }` |
| POST | `/store/pay` | Initiate payment for an existing QUOTE record; validates status=QUOTE before calling routing engine |
| GET | `/store/result?policyId=UUID` | Fetch result for any policy state — works for QUOTE (no transaction), PENDING, SUCCESS, FAILED |
| GET | `/store/policy/lookup?email=&policyNumber=` | Lookup policy by email + policy number; returns `{ policyId: UUID }` for redirect to status page |
| GET | `/store/policy/{policyId}` | Full policy status + event timeline (`PolicyStatusResponse`); UUID is the implicit access token |

### Admin — Reconciliation
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/recon` | Bearer | Paginated recon statements. Optional `?provider=BILLPLZ`. |
| GET | `/admin/recon/anomalies` | Bearer | Anomalies only. Optional `?provider=`. |
| GET | `/admin/recon/summary` | Bearer | Aggregate KPIs: `{ totalStatements, totalAnomalies, totalVariance }` |
| POST | `/admin/recon/import` | Bearer | Upload settlement `.xlsx` file (`multipart/form-data`, field name `file`). Returns `ReconImportResult`. |
| GET | `/admin/recon/template` | Bearer | Download pre-filled template XLSX from unreconciled transactions. `Content-Disposition: attachment; filename=settlement_template.xlsx` |

**Import Response:**
```json
{
  "success": true,
  "data": {
    "rowsProcessed": 10,
    "rowsMatched": 9,
    "rowsNoFee": 0,
    "rowsUnmatched": 1,
    "rowsSkipped": 0,
    "anomaliesFound": 1
  }
}
```

**Summary Response:**
```json
{
  "success": true,
  "data": {
    "totalStatements": 128,
    "totalAnomalies": 3,
    "totalVariance": "4.2500"
  }
}
```

**Template XLSX column layout:**

| Col | Header | Pre-filled? | Notes |
|---|---|---|---|
| A | `merchant_order_id` | ✅ | Used to match against `transactions` table on import |
| B | `provider` | ✅ | Informational only — not used during import |
| C | `payment_method` | ✅ | Informational only |
| D | `amount` | ✅ | Informational only |
| E | `expected_fee` | ✅ | `transactions.fee` at initiation time |
| F | `settlement_date` | ✅ | Date part of `transactions.created_at` |
| G | `actual_fee` | ❌ blank | **Admin fills this in** from provider settlement portal |

### Admin — Notification Queue
| Method | Path | Description |
|---|---|---|
| GET | `/admin/notification-queue/status` | Returns `{ consumerActive: boolean, queueDepth: long }` |
| POST | `/admin/notification-queue/consumer/start` | Starts the notification consumer |
| POST | `/admin/notification-queue/consumer/stop` | Stops the notification consumer |

**Status Response:**
```json
{
  "success": true,
  "data": {
    "consumerActive": true,
    "queueDepth": 0
  }
}
```

---

## 11. Success Criteria

### MVP Success Definition
The system is considered MVP-complete when an examiner can watch a 10-minute demo that includes: a payment routed intelligently, a provider failure with live failover, routing rule configuration affecting the next payment, and a cost comparison — without needing to explain what "payment orchestration" means.

### Functional Requirements
- ✅ Payment initiated via API routes to the correct provider based on region
- ✅ Disabling a provider in the dashboard causes the next payment to route to the fallback
- ✅ Duplicate payment request (same Idempotency-Key) returns cached response, no new transaction created
- ✅ Webhook from provider updates transaction status and appends event to timeline
- ✅ Routing rule with `region=MY` correctly overrides the scoring engine for Malaysian payments
- ✅ Simulate endpoint returns correct provider and score breakdown for test inputs
- ✅ Provider metrics update after each transaction (within 15-minute window)
- ✅ Webhook controller returns 200 immediately; processing happens asynchronously via RabbitMQ
- ✅ Failed payment retried 3 times with exponential backoff; ends up in DLQ if all attempts fail
- ✅ DLQ panel in admin dashboard shows RETRY_EXHAUSTED transactions with re-queue action
- ✅ All endpoints return consistent `ApiResponse<T>` envelope format
- ✅ Swagger UI at `/swagger-ui.html` documents all endpoints with examples
- ✅ Successful payment publishes `PaymentSucceededEvent` to durable `payment.notification.queue`
- ✅ Notification consumer writes `PREMIUM_ACTIVATED` / `CLAIM_DISBURSED` event to transaction timeline
- ✅ Stopping the consumer causes messages to queue up; restarting drains them without loss
- ✅ Demo policy table shows PENDING → ACTIVATED / DISBURSED transition driven by the notification consumer
- ✅ Pay button locks immediately on submission and cannot be re-clicked for the same policy
- ✅ Successful non-localhost payments auto-open the provider's hosted payment page in a new tab
- ✅ Branded HTML email sent to `holder_email` within seconds of PREMIUM_COLLECTION or CLAIMS_DISBURSEMENT payment success; SMTP failure never affects the payment transaction
- ✅ Fee rates are fully CRUD-manageable at runtime — create and delete rows via API/UI without migrations
- ✅ Customer policy status page (`/store/policy/:policyId`) shows policy details, payment routing decision, and append-only event timeline with no login required; auto-refreshes every 5 seconds when PENDING
- ✅ Policy lookup form (`/store/policy`) verifies ownership by email + policy number and redirects to UUID status URL
- ✅ Success and failure emails include a direct "View Policy Status" link pointing to `/store/policy/{policyId}`
- ✅ Reconciliation settlement file import: uploading an XLSX creates `recon_statement` rows matched to real transactions; anomalies auto-flagged where `|variance_pct| > 5%`; re-uploading the same file is safe (duplicates skipped); import result modal distinguishes matched / unmatched / blank-fee rows
- ✅ Reconciliation KPI strip reflects real aggregate totals (not current-page counts) via `/admin/recon/summary`
- ✅ Reconciliation template download pre-fills unreconciled transactions so the admin only needs to add `actual_fee`; temporal correctness guaranteed — `expected_fee` reads from `transactions.fee` (snapshot at initiation) not from live `provider_fee_rates`

### Demo Quality Goals
- ✅ Failover demo is reproducible on demand (Mock provider toggle)
- ✅ Transaction event timeline shows every step with timestamp and routing reason
- ✅ Dashboard loads with realistic seeded data (100+ transactions across all 3 regions)
- ✅ Cost savings card shows dollar/ringgit/peso figures, not percentages alone
- ✅ Notification queue depth counter updates live (3-second poll) during the consumer stop/start demo
- ✅ Policy table rows change color instantly after payment success (optimistic update) without page refresh

---

## 12. Implementation Phases

### Phase 1 — Foundation (Weeks 1–2)
**Goal:** Running app with real data flow, JWT auth, and Mock provider working end-to-end.

- ✅ Parent POM + all 7 Maven modules scaffolded
- ✅ `pos-common`: all enums (PaymentStatus, Region, Currency, Provider), DTOs, exceptions
- ✅ `pos-domain`: JPA entities + Flyway migrations V1–V7 + repositories
- ✅ Spring Security + JWT: `/auth/login` returns valid JWT
- ✅ Mock provider: full `PaymentProviderPort` implementation, in-memory state, toggleable mode
- ✅ RabbitMQ setup: Docker Compose service + Spring AMQP config + exchange/queue/DLQ topology declared on startup
- ✅ Basic `PaymentController`: `/payments/initiate` writes transaction, calls Mock, returns response

**Validation:** Postman: login → JWT → initiate payment → see `transactions` row in DB. RabbitMQ Management UI at `:15672` shows `webhook.queue` and `payment.dlq` declared.

---

### Phase 2 — Core Payment Flow (Weeks 3–4)
**Goal:** Full payment lifecycle working end-to-end with Mock provider.

- ✅ `RoutingEngine` with `RegionBasedStrategy` (simple region → provider mapping)
- ✅ `PaymentService.initiatePayment()` calls routing engine, writes `transaction_events`
- ✅ `IdempotencyService` + `IdempotencyFilter`
- ✅ `/payments/{id}/status` and `/payments/{id}/events`
- ✅ `WebhookController` verifies signature + parses payload, publishes `WebhookMessage` to `webhook.queue`, returns 200 immediately
- ✅ `WebhookConsumer` `@RabbitListener(webhook.queue)` processes async — updates transaction status, writes event, logs to `webhook_logs`; NACK → `webhook.dlq`
- ✅ Retry queue: `RetryPublisher` publishes `RetryMessage` with TTL-based backoff; TTL expiry DLX's to `retry.processing.queue`
- ✅ `RetryConsumer` `@RabbitListener(retry.processing.queue)` polls provider, re-publishes or routes to `payment.dlq` after 3 attempts
- ✅ `DlqConsumer` marks transaction `RETRY_EXHAUSTED`, writes event, available in admin API

**Validation:** Full lifecycle: initiate → mock webhook arrives → queued → consumed → SUCCESS. Set Mock to FAIL → watch 3 retry attempts in RabbitMQ UI → transaction appears in DLQ.

---

### Phase 3 — Smart Routing + Real Providers (Weeks 5–6)
**Goal:** Routing engine is intelligent. Real sandbox providers connected.

- ✅ `SuccessRateStrategy` + `LowestFeeStrategy` reading from `provider_metrics`
- ✅ `ProviderScorer`: composite score (40/25/15/20 weights — success rate / fee / latency / fee accuracy)
- ✅ `MetricsAggregator` scheduled job
- ✅ Billplz adapter + `/webhooks/billplz`
- ✅ Midtrans adapter + `/webhooks/midtrans`
- ✅ PayMongo adapter + `/webhooks/paymongo`
- ✅ `RefundService` + `POST /payments/{id}/refund`
- ✅ `RoutingRuleService` + full CRUD + `/admin/routing-rules/simulate`

**Validation:** Route a real payment to each sandbox. Create a rule that overrides the scorer. Simulate endpoint returns correct breakdown.

---

### Phase 4 — React Admin Dashboard (Weeks 7–8)
**Goal:** Full system demonstrable through browser.

- ✅ Project scaffold: React 18 + TypeScript + Vite + Ant Design, JWT interceptor (Axios), RequireAuth guard
- ✅ Login page + token storage
- ✅ Layout shell: Ant Design Sider + Header, NavLink sidebar, user dropdown
- ✅ Dashboard: KPI cards + Recharts volume chart + provider breakdown
- ✅ Transaction list: filterable, paginated, status badges
- ✅ Routing rules: CRUD table + create/edit modal + simulate panel
- ✅ Providers: health status, toggle, fee config edit
- ✅ Fee Rates: inline-editable table per provider/region; Add Rate modal (provider auto-locks region, method dropdown from DB) + row-level delete with confirm popover; full CRUD without migrations
- ✅ Payment Methods: CRUD per region, active toggle (DB-driven)
- ✅ Metrics: success rate + latency charts
- ✅ Reconciliation: recon statement table + anomaly filter + settlement file import (xlsx upload → match → variance → anomaly detection) + template download + aggregate KPI strip
- ✅ Dead Letter Queue: RETRY_EXHAUSTED transactions with re-queue action
- ✅ Payment Demo: DB-backed policy/claim table + payment form + routing result card + gateway redirect
- ✅ Notification Queue Panel: live queue depth counter + consumer on/off toggle (on Providers page)

**Validation:** 10-minute demo walkthrough without touching Postman.

---

### Phase 5 — Polish & FYP Hardening (Weeks 9–10)
**Goal:** Defensible, documented, seeded system ready for submission and viva.

- ✅ Swagger UI with request/response examples for all endpoints
- ✅ Audit log for admin actions (rule created, provider toggled)
- ✅ Consistent `GlobalExceptionHandler` returning `ApiResponse` error format
- ✅ Seed data script: 100+ transactions across all 3 regions and 4 providers
- ✅ Integration tests: `@SpringBootTest` + Testcontainers for `PaymentService` and `RoutingEngine`
- ✅ `application-prod.yml`: externalized secrets, HikariCP tuning
- ✅ Architecture diagram (system flow, ER diagram, provider adapter pattern) for dissertation

---

## 13. Future Considerations

- **Multi-tenant support** — multiple insurance company accounts with isolated routing rules
- **Recurring premium billing** — scheduled payment plans linked to policy renewal dates, with automatic retry on failure
- **Grace period / policy lapse engine** — if premium payment fails, hold policy active for N days before triggering a lapse event, integrating with the existing retry queue
- **Beneficiary management** — store and validate payout bank accounts for claim disbursements
- **Regulatory reporting** — export transaction ledger by policy/claim reference for OJK (Indonesia), BNM (Malaysia), IC (Philippines) compliance audits
- **Machine learning routing** — replace the heuristic scorer with a trained model on historical approval data
- **Real-time dashboard** — WebSocket push for live transaction updates instead of polling
- **A/B routing** — split traffic between providers to empirically measure success rates
- **BNPL providers** — Atome, Kredivo for Indonesia; BillEase for Philippines
- **GCash integration** — when/if GCash opens a developer sandbox
- **TNG eWallet direct API** — via aggregator (2C2P or Checkout.com) with business account
- **Circuit breaker** — Resilience4j circuit breaker per provider (currently just `isAvailable()` flag)
- **Payment analytics** — cohort analysis, decline reason breakdown, time-to-success distribution

---

## 14. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sandbox webhook delivery fails (ngrok disconnects) | High | Always have Mock provider as demo fallback; pre-record a webhook delivery for backup |
| Billplz/Midtrans/PayMongo sandbox API changes | Medium | Pin SDK versions; keep Mock provider behavior identical to real provider for demo-critical flows |
| Routing engine looks like `if/else` to examiners | Medium | The simulate endpoint's score breakdown UI is the proof — show numbers, not just a decision |
| Insufficient time to finish Angular dashboard | Medium | Build backend + Postman demo first; dashboard is enhancement. Core value is the routing engine. |
| GCash "no sandbox" question from examiner | Low | Prepare answer: "GCash has no developer sandbox — an industry-known limitation. We mock it and note this as a real-world constraint the orchestration layer is designed to abstract away." |
| "Why not Kafka?" question from examiner | Low | Prepared answer in Appendix. Short answer: RabbitMQ is the correct tool for task queues at this scale; Kafka is a log-streaming platform designed for millions of events/sec — using it here would be over-engineering with no benefit. |
| RabbitMQ adds complexity mid-project | Medium | RabbitMQ is set up in Phase 1 (Docker Compose), so it's available from day one. Spring AMQP's `@RabbitListener` annotation keeps consumer code simple. The management UI at `:15672` makes it easy to debug. |

---

## 15. Appendix

### Key Provider Documentation
- Billplz API: https://www.billplz.com/api
- Midtrans Docs: https://docs.midtrans.com
- PayMongo Docs: https://developers.paymongo.com
- Maya Developer Hub: https://developers.maya.ph

### Routing Score Formula
```
score(provider) =
  (success_rate_last_1h      × 0.40) +
  ((1 - normalized_fee)      × 0.25) +
  ((1 - normalized_latency)  × 0.15) +
  (fee_accuracy              × 0.20)

where:
  success_rate_last_1h
    = SUCCESS / (SUCCESS + FAILED + RETRY_EXHAUSTED) in the last 60-min window
      (terminal states only — in-flight PENDING/PROCESSING excluded from denominator)
      (defaults to 0.5 when no data)

  normalized_fee
    = volume-weighted avg fee / max_fee_among_eligible_providers
      volume weights derived from recon_statements payment method distribution per provider+region
      (falls back to context payment method fee when no recon history)

  normalized_latency
    = provider_avg_latency_ms / max_latency_among_eligible_providers
      avg_latency_ms = average of transactions.provider_latency_ms in the window
      provider_latency_ms = duration of provider.initiatePayment() API call only
      (excludes user think time and webhook delivery lag; defaults to 500ms when no data)

  fee_accuracy
    = AVG(1 − |variance| / expected_fee) from recon_statements since window_start
      (defaults to 1.0 when no recon history exists)

Weights are configurable in application.yml → routing.scorer.*
```

### Database Module Map
| Flyway Migration | Table | Key Columns / Notes |
|---|---|---|
| V1 | `users` | id, email, password_hash, role, refresh_token, token_expires_at |
| V2 | `transactions` | id, merchant_order_id, amount, currency, region, status, provider, routing_reason, fee, idempotency_key |
| V3 | `transaction_events` | id, transaction_id, event_type, description, created_at |
| V4 | `provider_configs` | provider, is_enabled, fee_percentage, webhook_secret, updated_at |
| V5 | `routing_rules` | id, priority, region, currency, max_amount, min_amount, preferred_provider, is_enabled |
| V6 | `provider_metrics` | id, provider, region, success_rate, avg_latency_ms, transaction_count, window_start, window_end |
| V7 | `webhook_logs` | id, provider, transaction_id, raw_body, signature_valid, received_at |
| V8 | `idempotency_records` | idempotency_key, request_hash, response_body, created_at, expires_at |
| V9 | `audit_logs` | id, admin_user, action, entity_type, entity_id, old_value, new_value, created_at |
| V10 | `provider_fee_rates` | provider, region, payment_method, fee_type, fixed_amount, percentage, currency, active |
| V11 | `recon_statements` | transaction_id, provider, region, expected_fee, actual_fee, variance, anomaly |
| V12 | `provider_metrics` (alter) | fee_accuracy_rate column added |
| V13 | `routing_rules` (alter) | strategy column added |
| V14 | seed data | dummy recon + metrics rows |
| V15 | `provider_fee_rates` (alter) | region column added |
| V16 | `recon_statements` (alter) | region column added |
| V17 | `transactions` (alter) | policy_number VARCHAR(100), claim_reference VARCHAR(100), payment_type VARCHAR(30) DEFAULT 'PREMIUM_COLLECTION' |
| V18 | `routing_rules` (alter) | payment_type column added |
| V19 | seed data | insurance-specific routing rules seeded |
| V20 | `payment_methods` (new) | Composite PK (code, region), name VARCHAR(100), is_active BOOLEAN; 13 seed rows; composite FK from transactions, provider_fee_rates, recon_statements |
| V21 | `demo_policies` (new) | id UUID PK, holder_name, holder_email, insurance_type, policy_number, claim_reference, amount DECIMAL(19,4), currency, region, payment_method, payment_type, status VARCHAR(20) DEFAULT 'PENDING', transaction_id UUID, created_at, updated_at; 6 seed rows (4 premium + 2 claims across MY/ID/PH) |
| V22 | `provider_configs` + `provider_fee_rates` (alter) | Inserts XENDIT into provider_configs (enabled, 2.5% fee); sets PAYMONGO is_enabled=false; inserts 5 Xendit PH fee rate rows (GCASH 2.5%, MAYA 2.2%, GRABPAY 2.5%, CARD PHP15+3.5%, EWALLET 2.5%) |
| V23 | `transactions` (alter) | Adds `va_number VARCHAR(100)` — populated for Midtrans VIRTUAL_ACCOUNT payments only; null for all other providers and methods |
| V24 | `store_products` (new) | id UUID PK, code VARCHAR(30) UNIQUE, name, insurance_type, tagline, amount DECIMAL(10,2), billing_period, features TEXT (pipe-separated), badge, sort_order INT, active BOOLEAN; 5 MY seed rows (life/medical/motor/travel/accident) |
| V25 | `store_products` (alter) | Adds `region VARCHAR(2)` and `currency VARCHAR(3)`; defaults existing rows to MY/MYR; seeds 5 ID (IDR) and 5 PH (PHP) products with `_id` and `_ph` code suffixes |
| V26 | `demo_policies` (alter) | Makes `payment_method` nullable — required for CLAIMS_DISBURSEMENT records where method is determined at payout time |
| V27 | `transactions` (alter) | Adds `provider_latency_ms BIGINT` (nullable) — stores the duration of the `initiatePayment()` API call in milliseconds; null for transactions created before this migration; used by `MetricsAggregator` for accurate provider latency scoring |

### RabbitMQ Queue Topology (Implementation Reference)
```yaml
# Docker Compose
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"    # AMQP
    - "15672:15672"  # Management UI (guest/guest in dev)

# Exchanges declared on startup (RabbitMqConfig @Bean)
webhook.exchange (direct)
  → webhook.queue          routing-key: webhook.queue
      DLX on NACK → webhook.exchange, routing-key: webhook.dlq
  → webhook.dlq            routing-key: webhook.dlq

retry.exchange (direct)
  → retry.q.30s            x-message-ttl: 30000,  DLX → retry.exchange, routing-key: retry.processing.queue
  → retry.q.60s            x-message-ttl: 60000,  DLX → retry.exchange, routing-key: retry.processing.queue
  → retry.q.120s           x-message-ttl: 120000, DLX → retry.exchange, routing-key: retry.processing.queue
  → retry.processing.queue routing-key: retry.processing.queue   ← RetryConsumer
  → payment.dlq            routing-key: payment.dlq              ← DlqConsumer (attempt 4+)

notification.exchange (direct)
  → payment.notification.queue
      Durable, no TTL, no DLX
      Consumer id: "notificationConsumer" (toggleable at runtime)

# application.yml — queue names
rabbitmq:
  exchanges:
    webhook: webhook.exchange
    retry: retry.exchange
    notification: notification.exchange
  queues:
    webhook: webhook.queue
    webhook-dlq: webhook.dlq
    retry-30s: retry.q.30s
    retry-60s: retry.q.60s
    retry-120s: retry.q.120s
    retry-processing: retry.processing.queue
    payment-dlq: payment.dlq
    notification: payment.notification.queue
```

**Consumer → queue mapping (implementation):**

| Class | Module | Listens on | Concern |
|---|---|---|---|
| `WebhookConsumer` | pos-admin | `webhook.queue` | Process inbound provider webhook events |
| `RetryConsumer` | pos-admin | `retry.processing.queue` | Poll provider status after TTL expiry |
| `DlqConsumer` | pos-admin | `payment.dlq` | Mark exhausted transactions `RETRY_EXHAUSTED` |
| `NotificationConsumer` | pos-admin | `payment.notification.queue` | Activate policy / dispatch email |

**Publisher → exchange mapping (implementation):**

| Class | Module | Publishes to | Message type |
|---|---|---|---|
| `WebhookPublisher` | pos-payment | `webhook.exchange → webhook.queue` | `WebhookMessage` |
| `RetryPublisher` | pos-payment | `retry.exchange → retry.q.{30s/60s/120s}` or `payment.dlq` | `RetryMessage` |
| `PaymentSucceededPublisher` | pos-payment | `notification.exchange → payment.notification.queue` | `PaymentSucceededEvent` |

### What Makes This Defensible in a Viva
1. **"Why not just use Xendit?"** — Xendit *is* one of our providers (Philippines region — GCash, Maya, GrabPay, cards, and disbursements). We route *to* Xendit alongside Billplz (Malaysia) and Midtrans (Indonesia). The orchestration layer is what selects *which* provider, when to fail over, and how to optimize cost across all three. Xendit doesn't solve that problem — it is one variable in the solution.
2. **"Is this a real problem?"** — Yes. Grab, Gojek, Shopee, and Lazada all operate internal payment orchestration layers for exactly this reason. This project is a demonstrable, smaller-scale implementation of the same pattern.
3. **"What's novel about your routing algorithm?"** — The composite scorer with tunable weights, region-aware rule engine, and real-time success rate feedback loop. Show the simulate endpoint's breakdown table.
4. **"Why RabbitMQ and not Kafka?"** — RabbitMQ is purpose-built for task queues with routing, TTL, and dead letter patterns. Kafka is a distributed log designed for event streaming at millions of events/second — using it here would be like using a freight train to deliver a letter. RabbitMQ's dead letter exchange gives us native exponential backoff with zero custom scheduling code.
5. **"What happens when a payment gets stuck?"** — Show the DLQ panel. Walk through: provider failure → 3 retry attempts with increasing delays → RETRY_EXHAUSTED status → admin sees it → clicks Re-queue after provider recovers → payment completes. This is a production-grade failure recovery flow.
6. **"Why insurance?"** — Insurance payments are uniquely demanding: premiums must reach the right provider to trigger policy coverage, claim payouts must be fast and traceable to avoid regulatory penalties, and failed payments have real consequences (policy lapse). This makes payment orchestration — not just payment processing — essential in insurance. The same routing engine that minimizes fees for a merchant minimizes delays for a claims payout.
7. **"What happens downstream after a payment succeeds?"** — A `PaymentSucceededEvent` is published to a durable RabbitMQ notification queue. A consumer picks it up and activates the linked insurance policy (or marks the claim as disbursed) by writing to `transaction_events` and updating the `demo_policies` table. You can stop the consumer live, queue up 5 payments, then restart — all 5 process instantly without loss. This proves the system is not tightly coupled: the payment path and the insurance activation path are independent and survivable.
8. **"Why do you poll the provider instead of relying purely on webhooks?"** — We don't poll instead of webhooks — we use both, with webhooks as the primary signal. The active retry loop is a deliberate trade-off for the demo environment: a production system would use webhooks as the real-time signal and a scheduled hourly reconciliation job to backfill any missed events. We chose an active retry loop because (a) our demo scale is trivially small so rate limits are irrelevant, (b) ngrok is unreliable in a live demo setting so we can't bet a 10-minute examiner slot on webhook delivery, and (c) the retry queue draining and DLQ panel are visibly demonstrable in real time — a scheduled reconciliation job that runs hourly gives us nothing to show. The retry consumer also skips silently if the webhook already resolved the transaction, so there is no double-processing risk.
9. **"Isn't the demo policy table just fake data?"** — Yes, intentionally. In production, these records would be pushed in by a separate Policy Administration System (PAS) via the same API. The demo simulates what the PAS would do, so the examiner sees a realistic insurance back-office flow rather than a blank payment form. The `POST /admin/demo-policies` endpoint is exactly the contract a real PAS integration would call.
10. **"Why does the InsureStore email a payment link instead of redirecting immediately?"** — This is the industry-standard "quote-first" pattern used by Etiqa, Prudential MY, and Great Eastern. It solves three real problems: (1) **Back-button duplicate payments** — if the customer is redirected to the payment provider immediately and presses back, pressing "Pay" again would create a second transaction for the same policy; our flow never opens the provider page until the customer explicitly clicks the email link, making double-charging architecturally impossible. (2) **Customer trust** — insurance premiums are not impulse purchases; customers may want to review the quote, read the fine print, or discuss with a family member before paying. Forcing an immediate redirect treats a RM500/year policy like a RM5 coffee. (3) **Lead capture** — the `QUOTE` record is saved in `demo_policies` the moment the form is submitted, even if the customer never pays. An ops team could follow up on abandoned quotes. The trade-off is one extra step for the customer (opening email), which major insurers have found acceptable given the trust benefit.
