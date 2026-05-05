ALTER TABLE transactions
    ADD COLUMN policy_number   VARCHAR(100),
    ADD COLUMN claim_reference VARCHAR(100),
    ADD COLUMN payment_type    VARCHAR(30);
