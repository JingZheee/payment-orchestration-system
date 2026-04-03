CREATE TABLE provider_metrics (
    id                BIGSERIAL     PRIMARY KEY,
    provider          VARCHAR(20)   NOT NULL,
    region            VARCHAR(2)    NOT NULL,
    success_rate      NUMERIC(5, 4) NOT NULL,
    avg_latency_ms    BIGINT        NOT NULL,
    transaction_count INT           NOT NULL,
    window_start      TIMESTAMPTZ   NOT NULL,
    window_end        TIMESTAMPTZ   NOT NULL
);

CREATE INDEX idx_provider_metrics_provider_region ON provider_metrics (provider, region, window_end DESC);
