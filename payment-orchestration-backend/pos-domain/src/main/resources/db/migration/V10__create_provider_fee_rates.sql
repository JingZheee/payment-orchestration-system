CREATE TABLE provider_fee_rates (
    id             BIGSERIAL     PRIMARY KEY,
    provider       VARCHAR(20)   NOT NULL,
    payment_method VARCHAR(30)   NOT NULL,
    fee_type       VARCHAR(30)   NOT NULL,   -- FIXED | PERCENTAGE | FIXED_PLUS_PERCENTAGE
    fixed_amount   NUMERIC(19,4),
    percentage     NUMERIC(7,6),
    currency       VARCHAR(5)    NOT NULL,
    is_active      BOOLEAN       NOT NULL DEFAULT true,
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (provider, payment_method)
);

-- Billplz (Malaysia)
INSERT INTO provider_fee_rates (provider, payment_method, fee_type, fixed_amount, percentage, currency) VALUES
    ('BILLPLZ', 'FPX',    'FIXED',      1.2500, NULL,    'MYR'),
    ('BILLPLZ', 'CARD',   'PERCENTAGE', NULL,   0.015000, 'MYR'),
    ('BILLPLZ', 'EWALLET','PERCENTAGE', NULL,   0.015000, 'MYR');

-- Midtrans (Indonesia)
INSERT INTO provider_fee_rates (provider, payment_method, fee_type, fixed_amount, percentage, currency) VALUES
    ('MIDTRANS', 'VIRTUAL_ACCOUNT', 'FIXED',                4000.0000, NULL,     'IDR'),
    ('MIDTRANS', 'QRIS',            'PERCENTAGE',           NULL,      0.007000, 'IDR'),
    ('MIDTRANS', 'GOPAY',           'PERCENTAGE',           NULL,      0.020000, 'IDR'),
    ('MIDTRANS', 'EWALLET',         'PERCENTAGE',           NULL,      0.020000, 'IDR'),
    ('MIDTRANS', 'CARD',            'FIXED_PLUS_PERCENTAGE',2000.0000, 0.029000, 'IDR');

-- PayMongo (Philippines)
INSERT INTO provider_fee_rates (provider, payment_method, fee_type, fixed_amount, percentage, currency) VALUES
    ('PAYMONGO', 'MAYA',    'PERCENTAGE',            NULL,    0.017900, 'PHP'),
    ('PAYMONGO', 'GCASH',   'PERCENTAGE',            NULL,    0.022300, 'PHP'),
    ('PAYMONGO', 'GRABPAY', 'PERCENTAGE',            NULL,    0.019600, 'PHP'),
    ('PAYMONGO', 'CARD',    'FIXED_PLUS_PERCENTAGE', 13.3900, 0.031250, 'PHP'),
    ('PAYMONGO', 'EWALLET', 'PERCENTAGE',            NULL,    0.022300, 'PHP');

-- Mock (all regions, flat 1%)
INSERT INTO provider_fee_rates (provider, payment_method, fee_type, fixed_amount, percentage, currency) VALUES
    ('MOCK', 'FPX',             'PERCENTAGE', NULL, 0.010000, 'MYR'),
    ('MOCK', 'VIRTUAL_ACCOUNT', 'PERCENTAGE', NULL, 0.010000, 'IDR'),
    ('MOCK', 'QRIS',            'PERCENTAGE', NULL, 0.010000, 'IDR'),
    ('MOCK', 'MAYA',            'PERCENTAGE', NULL, 0.010000, 'PHP'),
    ('MOCK', 'GCASH',           'PERCENTAGE', NULL, 0.010000, 'PHP'),
    ('MOCK', 'CARD',            'PERCENTAGE', NULL, 0.010000, 'MYR'),
    ('MOCK', 'EWALLET',         'PERCENTAGE', NULL, 0.010000, 'MYR');
