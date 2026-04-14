CREATE TABLE recon_statements (
    id                  BIGSERIAL     PRIMARY KEY,
    transaction_id      UUID          REFERENCES transactions(id),   -- nullable for imported/dummy records
    provider            VARCHAR(20)   NOT NULL,
    payment_method      VARCHAR(30),                                  -- known only at reconciliation time
    transaction_amount  NUMERIC(19,4) NOT NULL,
    expected_fee        NUMERIC(19,4),
    actual_fee          NUMERIC(19,4),
    variance            NUMERIC(19,4),                                -- actual_fee - expected_fee
    variance_pct        NUMERIC(7,4),                                 -- |variance| / expected_fee * 100
    is_anomaly          BOOLEAN       NOT NULL DEFAULT false,
    statement_date      DATE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_recon_provider            ON recon_statements (provider);
CREATE INDEX idx_recon_provider_method     ON recon_statements (provider, payment_method);
CREATE INDEX idx_recon_anomaly             ON recon_statements (is_anomaly) WHERE is_anomaly = true;
