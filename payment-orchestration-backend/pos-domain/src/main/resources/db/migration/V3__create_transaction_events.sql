-- Append-only audit trail — no updates, only inserts
CREATE TABLE transaction_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID        NOT NULL REFERENCES transactions(id),
    event_type     VARCHAR(50) NOT NULL,
    description    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_events_txn ON transaction_events (transaction_id, created_at ASC);
