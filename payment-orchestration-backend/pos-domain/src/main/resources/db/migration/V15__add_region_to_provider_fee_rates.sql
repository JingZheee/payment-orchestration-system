-- Add region column to provider_fee_rates and change unique constraint to (provider, region, payment_method).
-- Region is derived from the currency column already present in V10 seed data (MYR→MY, IDR→ID, PHP→PH).
-- MOCK rows are already implicitly region-scoped by method/currency, so no row duplication is needed.

ALTER TABLE provider_fee_rates ADD COLUMN region VARCHAR(10) NULL;

UPDATE provider_fee_rates SET region = CASE currency
    WHEN 'MYR' THEN 'MY'
    WHEN 'IDR' THEN 'ID'
    WHEN 'PHP' THEN 'PH'
    ELSE 'MY'
END;

ALTER TABLE provider_fee_rates ALTER COLUMN region SET NOT NULL;

ALTER TABLE provider_fee_rates
    DROP CONSTRAINT provider_fee_rates_provider_payment_method_key;

ALTER TABLE provider_fee_rates
    ADD CONSTRAINT uq_provider_region_payment_method
    UNIQUE (provider, region, payment_method);
