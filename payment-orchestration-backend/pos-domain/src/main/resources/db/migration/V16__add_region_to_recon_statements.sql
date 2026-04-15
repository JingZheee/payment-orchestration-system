-- Add region column to recon_statements so ProviderScorer can scope volume-weighted
-- fee calculations to the correct region (important for MOCK which covers all three regions).
-- Single-region providers (BILLPLZ=MY, MIDTRANS=ID, PAYMONGO=PH) are backfilled deterministically.
-- Historical MOCK rows remain NULL (region unknown) and are excluded from region-scoped queries.

ALTER TABLE recon_statements ADD COLUMN region VARCHAR(10) NULL;

UPDATE recon_statements SET region = 'MY' WHERE provider = 'BILLPLZ';
UPDATE recon_statements SET region = 'ID' WHERE provider = 'MIDTRANS';
UPDATE recon_statements SET region = 'PH' WHERE provider = 'PAYMONGO';

CREATE INDEX idx_recon_provider_region ON recon_statements (provider, region);
