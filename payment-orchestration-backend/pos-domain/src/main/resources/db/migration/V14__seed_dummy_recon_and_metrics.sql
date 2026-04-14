-- ─────────────────────────────────────────────────────────────────────────────
-- Dummy recon_statements for volume-weighted fee scoring
-- transaction_id is NULL for all dummy records (imported before real transactions)
--
-- Distribution:
--   BILLPLZ/MY   : 100% FPX
--   MIDTRANS/ID  : 60% VIRTUAL_ACCOUNT, 30% QRIS, 10% GOPAY
--   PAYMONGO/PH  : 50% MAYA, 30% CARD, 20% GCASH
--   MOCK/MY      : 100% FPX
--   MOCK/ID      : 60% VIRTUAL_ACCOUNT, 40% QRIS
--   MOCK/PH      : 60% MAYA, 40% GCASH
-- ─────────────────────────────────────────────────────────────────────────────

-- BILLPLZ — FPX (30 records, fixed MYR 1.25, ~99% accuracy)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'BILLPLZ', 'FPX', (50 + (gs % 450))::NUMERIC, 1.25, 1.26, 0.01, 0.80, false, ('2026-03-01'::date + (gs % 30))
FROM generate_series(1, 30) gs;

-- MIDTRANS — VIRTUAL_ACCOUNT (18 records, fixed IDR 4000, ~98% accuracy)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MIDTRANS', 'VIRTUAL_ACCOUNT', (10000 + (gs % 90000))::NUMERIC, 4000.00, 4000.00 + (gs % 2) * 50, (gs % 2) * 50.0, ((gs % 2) * 50.0 / 4000.0 * 100), false, ('2026-03-01'::date + (gs % 30))
FROM generate_series(1, 18) gs;

-- MIDTRANS — QRIS (9 records, 0.7%)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MIDTRANS', 'QRIS', amt::NUMERIC,
       ROUND(amt * 0.007, 4),
       ROUND(amt * 0.007 + (gs % 3) * 5, 4),
       ROUND((gs % 3) * 5.0, 4),
       ROUND(((gs % 3) * 5.0) / (amt * 0.007) * 100, 4),
       false,
       ('2026-03-01'::date + (gs % 30))
FROM (SELECT gs, 5000 + (gs * 3000) AS amt FROM generate_series(1, 9) gs) t;

-- MIDTRANS — GOPAY (3 records, 2.0%) — one anomaly to demo alert
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
VALUES
    ('MIDTRANS', 'GOPAY', 50000.00, 1000.00, 1020.00,  20.00,  2.00, false, '2026-03-05'),
    ('MIDTRANS', 'GOPAY', 75000.00, 1500.00, 1530.00,  30.00,  2.00, false, '2026-03-12'),
    ('MIDTRANS', 'GOPAY', 30000.00, 600.00,  660.00,   60.00, 10.00, true,  '2026-03-20');  -- anomaly: 10% overcharge

-- PAYMONGO — MAYA (15 records, 1.79%, ~97% accuracy)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'PAYMONGO', 'MAYA', amt::NUMERIC,
       ROUND(amt * 0.0179, 4),
       ROUND(amt * 0.0179 * 1.01, 4),
       ROUND(amt * 0.0179 * 0.01, 4),
       1.00,
       false,
       ('2026-03-01'::date + (gs % 30))
FROM (SELECT gs, 200 + (gs * 50) AS amt FROM generate_series(1, 15) gs) t;

-- PAYMONGO — CARD (9 records, 3.125% + PHP 13.39)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'PAYMONGO', 'CARD', amt::NUMERIC,
       ROUND(amt * 0.03125 + 13.39, 4),
       ROUND((amt * 0.03125 + 13.39) * 1.01, 4),
       ROUND((amt * 0.03125 + 13.39) * 0.01, 4),
       1.00,
       false,
       ('2026-03-01'::date + (gs % 30))
FROM (SELECT gs, 500 + (gs * 100) AS amt FROM generate_series(1, 9) gs) t;

-- PAYMONGO — GCASH (6 records, 2.23%)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'PAYMONGO', 'GCASH', amt::NUMERIC,
       ROUND(amt * 0.0223, 4),
       ROUND(amt * 0.0223, 4),
       0.00, 0.00, false,
       ('2026-03-01'::date + (gs % 30))
FROM (SELECT gs, 300 + (gs * 80) AS amt FROM generate_series(1, 6) gs) t;

-- MOCK — FPX (5 records, 1%, perfect accuracy)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MOCK', 'FPX', amt::NUMERIC, ROUND(amt * 0.01, 4), ROUND(amt * 0.01, 4), 0.00, 0.00, false, '2026-03-15'
FROM (SELECT gs, 100 + (gs * 50) AS amt FROM generate_series(1, 5) gs) t;

-- MOCK — VIRTUAL_ACCOUNT (3 records) and QRIS (2 records)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MOCK', 'VIRTUAL_ACCOUNT', amt::NUMERIC, ROUND(amt * 0.01, 4), ROUND(amt * 0.01, 4), 0.00, 0.00, false, '2026-03-15'
FROM (SELECT gs, 10000 + (gs * 5000) AS amt FROM generate_series(1, 3) gs) t;

INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MOCK', 'QRIS', amt::NUMERIC, ROUND(amt * 0.01, 4), ROUND(amt * 0.01, 4), 0.00, 0.00, false, '2026-03-15'
FROM (SELECT gs, 8000 + (gs * 3000) AS amt FROM generate_series(1, 2) gs) t;

-- MOCK — MAYA (3 records) and GCASH (2 records)
INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MOCK', 'MAYA', amt::NUMERIC, ROUND(amt * 0.01, 4), ROUND(amt * 0.01, 4), 0.00, 0.00, false, '2026-03-15'
FROM (SELECT gs, 200 + (gs * 100) AS amt FROM generate_series(1, 3) gs) t;

INSERT INTO recon_statements (provider, payment_method, transaction_amount, expected_fee, actual_fee, variance, variance_pct, is_anomaly, statement_date)
SELECT 'MOCK', 'GCASH', amt::NUMERIC, ROUND(amt * 0.01, 4), ROUND(amt * 0.01, 4), 0.00, 0.00, false, '2026-03-15'
FROM (SELECT gs, 300 + (gs * 120) AS amt FROM generate_series(1, 2) gs) t;


-- ─────────────────────────────────────────────────────────────────────────────
-- Seed provider_metrics with realistic values (one window per provider+region)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO provider_metrics (provider, region, success_rate, avg_latency_ms, transaction_count, fee_accuracy_rate, window_start, window_end) VALUES
    ('BILLPLZ',  'MY', 0.9500, 850,  30, 0.9900, '2026-04-14 00:00:00+00', '2026-04-14 23:59:59+00'),
    ('MIDTRANS', 'ID', 0.9200, 1200, 30, 0.9750, '2026-04-14 00:00:00+00', '2026-04-14 23:59:59+00'),
    ('PAYMONGO', 'PH', 0.9300, 950,  30, 0.9700, '2026-04-14 00:00:00+00', '2026-04-14 23:59:59+00'),
    ('MOCK',     'MY', 1.0000, 45,   15, 1.0000, '2026-04-14 00:00:00+00', '2026-04-14 23:59:59+00'),
    ('MOCK',     'ID', 1.0000, 45,   5,  1.0000, '2026-04-14 00:00:00+00', '2026-04-14 23:59:59+00'),
    ('MOCK',     'PH', 1.0000, 45,   5,  1.0000, '2026-04-14 00:00:00+00', '2026-04-14 23:59:59+00');


-- ─────────────────────────────────────────────────────────────────────────────
-- Seed demo routing rules (strategy-based, no preferred_provider)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO routing_rules (priority, region, preferred_provider, strategy, is_enabled) VALUES
    (1, 'MY', NULL, 'LOWEST_FEE',   true),
    (2, 'ID', NULL, 'SUCCESS_RATE', true),
    (3, 'PH', NULL, 'LOWEST_FEE',   true);
