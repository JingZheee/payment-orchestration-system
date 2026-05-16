-- Demo policy/claim records that simulate a Policy Management System (PMS).
-- Used only for examiner demo — not part of the core payment orchestration domain.
CREATE TABLE demo_policies (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    holder_name     VARCHAR(100) NOT NULL,
    holder_email    VARCHAR(100) NOT NULL,
    insurance_type  VARCHAR(50)  NOT NULL,
    policy_number   VARCHAR(50),
    claim_reference VARCHAR(50),
    amount          DECIMAL(19,4) NOT NULL,
    currency        VARCHAR(3)   NOT NULL,
    region          VARCHAR(2)   NOT NULL,
    payment_method  VARCHAR(30)  NOT NULL,
    payment_type    VARCHAR(30)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    transaction_id  UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed: premium collection queue
INSERT INTO demo_policies (holder_name, holder_email, insurance_type, policy_number, amount, currency, region, payment_method, payment_type)
VALUES
  ('Ahmad Razif bin Ismail',      'ahmad.razif@mymail.com',    'Life Insurance',    'POL-2025-MY-001', 450.0000,    'MYR', 'MY', 'FPX',             'PREMIUM_COLLECTION'),
  ('Siti Norzahara binti Hassan', 'siti.norzahara@mymail.com', 'Medical Insurance', 'POL-2025-MY-002', 280.0000,    'MYR', 'MY', 'FPX',             'PREMIUM_COLLECTION'),
  ('Budi Santoso',                'budi.santoso@email.id',     'Life Insurance',    'POL-2025-ID-001', 850000.0000, 'IDR', 'ID', 'VIRTUAL_ACCOUNT', 'PREMIUM_COLLECTION'),
  ('Maria Santos',                'maria.santos@ph.com',       'Health Insurance',  'POL-2025-PH-001', 1200.0000,   'PHP', 'PH', 'MAYA',            'PREMIUM_COLLECTION');

-- Seed: claims disbursement queue
INSERT INTO demo_policies (holder_name, holder_email, insurance_type, policy_number, claim_reference, amount, currency, region, payment_method, payment_type)
VALUES
  ('Tan Wei Liang',    'tan.weiliang@mymail.com',   'Medical Claim',  'POL-2024-MY-081', 'CLM-2025-MY-001', 3200.0000,   'MYR', 'MY', 'FPX',  'CLAIMS_DISBURSEMENT'),
  ('Elena Villanueva', 'elena.villanueva@ph.com',   'Health Claim',   'POL-2024-PH-033', 'CLM-2025-PH-001', 8900.0000,   'PHP', 'PH', 'MAYA', 'CLAIMS_DISBURSEMENT');
