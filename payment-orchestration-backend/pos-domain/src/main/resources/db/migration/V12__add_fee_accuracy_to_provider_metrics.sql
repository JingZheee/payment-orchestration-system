ALTER TABLE provider_metrics
    ADD COLUMN fee_accuracy_rate NUMERIC(5,4) NOT NULL DEFAULT 1.0000;
