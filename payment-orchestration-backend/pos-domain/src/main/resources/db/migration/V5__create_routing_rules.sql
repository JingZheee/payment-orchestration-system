CREATE TABLE routing_rules (
    id                 BIGSERIAL    PRIMARY KEY,
    priority           INT          NOT NULL,
    region             VARCHAR(2),
    currency           VARCHAR(3),
    min_amount         NUMERIC(19, 4),
    max_amount         NUMERIC(19, 4),
    preferred_provider VARCHAR(20)  NOT NULL,
    is_enabled         BOOLEAN      NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_routing_rules_priority ON routing_rules (priority ASC) WHERE is_enabled = true;
