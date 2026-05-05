-- Priority 1: Claims disbursements → SUCCESS_RATE (reliability first — failed payouts are unacceptable)
INSERT INTO routing_rules (priority, payment_type, strategy, is_enabled)
VALUES (1, 'CLAIMS_DISBURSEMENT', 'SUCCESS_RATE', true);

-- Priority 2: Premium collection → LOWEST_FEE (cost optimisation for high-volume inbound payments)
INSERT INTO routing_rules (priority, payment_type, strategy, is_enabled)
VALUES (2, 'PREMIUM_COLLECTION', 'LOWEST_FEE', true);
