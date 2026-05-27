-- Product catalogue for the InsureRoute customer-facing store demo.
-- Products are DB-driven so the examiner demo can modify them without touching frontend code.
CREATE TABLE store_products (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(30)   NOT NULL UNIQUE,
    name           VARCHAR(100)  NOT NULL,
    insurance_type VARCHAR(60)   NOT NULL,
    tagline        VARCHAR(200)  NOT NULL,
    amount         DECIMAL(10,2) NOT NULL,
    billing_period VARCHAR(20)   NOT NULL,
    features       TEXT          NOT NULL,   -- pipe-separated list of feature strings
    badge          VARCHAR(50),
    sort_order     INT           NOT NULL DEFAULT 0,
    active         BOOLEAN       NOT NULL DEFAULT TRUE
);

INSERT INTO store_products (code, name, insurance_type, tagline, amount, billing_period, features, badge, sort_order)
VALUES
  ('life',     'Life Guard Plus',   'Life Insurance',    'Financial security for the people who matter most',    88.00,  'month', 'MYR 250,000 life coverage|Accidental death benefit|Total permanent disability',  'Most Popular', 1),
  ('medical',  'MediShield Elite',  'Medical Insurance', 'Comprehensive hospital & surgical coverage',          120.00,  'month', 'Up to MYR 500,000 per year|Panel hospitals nationwide|Outpatient GP coverage',    NULL,           2),
  ('motor',    'AutoProtect',       'Motor Insurance',   'Complete vehicle protection on Malaysian roads',      350.00,  'year',  'Third-party liability|Own damage & theft|24/7 roadside assistance',              NULL,           3),
  ('travel',   'TravelSafe MY',     'Travel Insurance',  'Peace of mind wherever your journey takes you',       45.00,  'trip',  'Emergency medical abroad|Trip cancellation cover|Baggage loss & delay',           NULL,           4),
  ('accident', 'Personal Accident', 'Personal Accident', '24/7 protection against life''s unexpected moments',  35.00,  'month', 'Accidental death & disability|Medical expense reimbursement|Hospital daily income', NULL,           5);
