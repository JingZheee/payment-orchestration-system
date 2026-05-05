-- Create payment_methods as a DB-managed catalog replacing the hardcoded PaymentMethod enum.
-- Composite PK (code, region) allows per-region active control (e.g. disable CARD in PH
-- without affecting CARD in MY or ID).
--
-- FK constraints on transactions, provider_fee_rates, and recon_statements are safe because:
--  - All three tables already store exact enum-name strings (FPX, VIRTUAL_ACCOUNT, etc.)
--  - recon_statements MOCK rows have region=NULL → FK bypassed by PostgreSQL NULL semantics
--  - MOCK provider_fee_rates are already region-scoped via V15 currency→region backfill

CREATE TABLE payment_methods (
    code       VARCHAR(30)  NOT NULL,
    region     VARCHAR(10)  NOT NULL,
    name       VARCHAR(100) NOT NULL,
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (code, region)
);

INSERT INTO payment_methods (code, region, name) VALUES
    ('FPX',             'MY', 'FPX Bank Transfer'),
    ('CARD',            'MY', 'Credit / Debit Card'),
    ('EWALLET',         'MY', 'E-Wallet'),
    ('VIRTUAL_ACCOUNT', 'ID', 'Virtual Account'),
    ('QRIS',            'ID', 'QRIS Payment'),
    ('GOPAY',           'ID', 'GoPay'),
    ('CARD',            'ID', 'Credit / Debit Card'),
    ('EWALLET',         'ID', 'E-Wallet'),
    ('MAYA',            'PH', 'Maya Wallet'),
    ('GCASH',           'PH', 'GCash'),
    ('GRABPAY',         'PH', 'GrabPay'),
    ('CARD',            'PH', 'Credit / Debit Card'),
    ('EWALLET',         'PH', 'E-Wallet');

ALTER TABLE transactions
    ADD CONSTRAINT fk_tx_payment_method
    FOREIGN KEY (payment_method, region) REFERENCES payment_methods(code, region);

ALTER TABLE provider_fee_rates
    ADD CONSTRAINT fk_fee_rate_payment_method
    FOREIGN KEY (payment_method, region) REFERENCES payment_methods(code, region);

-- recon_statements: MOCK rows have region=NULL so the FK is only enforced for non-NULL region rows
ALTER TABLE recon_statements
    ADD CONSTRAINT fk_recon_payment_method
    FOREIGN KEY (payment_method, region) REFERENCES payment_methods(code, region);
