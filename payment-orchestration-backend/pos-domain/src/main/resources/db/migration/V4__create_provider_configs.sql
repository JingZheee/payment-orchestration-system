CREATE TABLE provider_configs (
    provider        VARCHAR(20)    PRIMARY KEY,
    is_enabled      BOOLEAN        NOT NULL DEFAULT true,
    fee_percentage  NUMERIC(5, 4)  NOT NULL DEFAULT 0.0200,
    webhook_secret  VARCHAR(512),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Seed default provider configs
INSERT INTO provider_configs (provider, is_enabled, fee_percentage) VALUES
    ('BILLPLZ',  true, 0.0150),
    ('MIDTRANS', true, 0.0200),
    ('PAYMONGO', true, 0.0250),
    ('MOCK',     true, 0.0100);
