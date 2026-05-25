-- Add Xendit as the Philippines provider (replaces PayMongo which had geo-restricted sandbox).
-- PayMongo row is kept but disabled so historical data references remain valid.

INSERT INTO provider_configs (provider, is_enabled, fee_percentage)
VALUES ('XENDIT', true, 0.0250);

UPDATE provider_configs SET is_enabled = false WHERE provider = 'PAYMONGO';

-- Xendit PH fee rates (actual Xendit sandbox/production rates)
INSERT INTO provider_fee_rates (provider, region, payment_method, fee_type, fixed_amount, percentage, currency) VALUES
    ('XENDIT', 'PH', 'GCASH',   'PERCENTAGE',            NULL,    0.025000, 'PHP'),
    ('XENDIT', 'PH', 'MAYA',    'PERCENTAGE',            NULL,    0.022000, 'PHP'),
    ('XENDIT', 'PH', 'GRABPAY', 'PERCENTAGE',            NULL,    0.025000, 'PHP'),
    ('XENDIT', 'PH', 'CARD',    'FIXED_PLUS_PERCENTAGE', 15.0000, 0.035000, 'PHP'),
    ('XENDIT', 'PH', 'EWALLET', 'PERCENTAGE',            NULL,    0.025000, 'PHP');
