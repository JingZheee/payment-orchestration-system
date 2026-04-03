CREATE TABLE transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_order_id       VARCHAR(255) NOT NULL,
    amount                  NUMERIC(19, 4) NOT NULL,
    currency                VARCHAR(3)   NOT NULL,
    region                  VARCHAR(2)   NOT NULL,
    status                  VARCHAR(30)  NOT NULL,
    provider                VARCHAR(20)  NOT NULL,
    payment_method          VARCHAR(30),
    routing_reason          TEXT,
    routing_strategy        VARCHAR(30),
    provider_transaction_id VARCHAR(255),
    redirect_url            TEXT,
    fee                     NUMERIC(19, 4),
    customer_email          VARCHAR(255),
    description             TEXT,
    idempotency_key         VARCHAR(255) UNIQUE,
    retry_count             INT          NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_status   ON transactions (status);
CREATE INDEX idx_transactions_provider ON transactions (provider);
CREATE INDEX idx_transactions_region   ON transactions (region);
CREATE INDEX idx_transactions_created  ON transactions (created_at DESC);
