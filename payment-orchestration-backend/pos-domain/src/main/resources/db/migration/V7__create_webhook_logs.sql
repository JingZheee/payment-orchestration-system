CREATE TABLE webhook_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider         VARCHAR(20)  NOT NULL,
    transaction_id   UUID,
    raw_body         TEXT         NOT NULL,
    signature_valid  BOOLEAN      NOT NULL,
    received_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    processed_at     TIMESTAMPTZ
);

CREATE INDEX idx_webhook_logs_provider    ON webhook_logs (provider, received_at DESC);
CREATE INDEX idx_webhook_logs_transaction ON webhook_logs (transaction_id);
