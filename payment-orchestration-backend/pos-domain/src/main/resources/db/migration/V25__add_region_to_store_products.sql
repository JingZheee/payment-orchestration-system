-- Add region + currency to store_products so each product belongs to a specific market.
-- Existing rows default to MY / MYR (all current products are Malaysian).
ALTER TABLE store_products
    ADD COLUMN region   VARCHAR(2) NOT NULL DEFAULT 'MY',
    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'MYR';

-- Tag existing Malaysian products explicitly
UPDATE store_products SET region = 'MY', currency = 'MYR';

-- ── Indonesia (IDR) ──────────────────────────────────────────────────────────
INSERT INTO store_products (code, name, insurance_type, tagline, amount, billing_period, features, badge, sort_order, region, currency)
VALUES
  ('life_id',
   'Proteksi Jiwa Plus',
   'Life Insurance',
   'Perlindungan jiwa komprehensif untuk masa depan keluarga Anda',
   950000.00, 'month',
   'Uang pertanggungan Rp 1 miliar|Manfaat kematian akibat kecelakaan|Cacat tetap total & sebagian',
   'Terlaris', 1, 'ID', 'IDR'),

  ('medical_id',
   'MediShield Elite ID',
   'Medical Insurance',
   'Perlindungan rawat inap dan bedah terlengkap di seluruh Indonesia',
   1500000.00, 'month',
   'Hingga Rp 2 miliar per tahun|Rumah sakit rekanan di seluruh Indonesia|Rawat jalan dan konsultasi dokter',
   NULL, 2, 'ID', 'IDR'),

  ('motor_id',
   'AutoProteksi ID',
   'Motor Insurance',
   'Perlindungan kendaraan lengkap di jalan-jalan Indonesia',
   4200000.00, 'year',
   'Tanggung gugat pihak ketiga|Kerusakan sendiri & kehilangan|Bantuan darurat 24/7',
   NULL, 3, 'ID', 'IDR'),

  ('travel_id',
   'TravelSafe ID',
   'Travel Insurance',
   'Ketenangan pikiran dalam setiap perjalanan Anda ke luar negeri',
   420000.00, 'trip',
   'Biaya medis darurat di luar negeri|Pembatalan & penundaan perjalanan|Kehilangan & kerusakan bagasi',
   NULL, 4, 'ID', 'IDR'),

  ('accident_id',
   'Kecelakaan Diri',
   'Personal Accident',
   'Perlindungan 24 jam dari risiko kecelakaan tak terduga',
   290000.00, 'month',
   'Santunan kematian & cacat akibat kecelakaan|Penggantian biaya medis kecelakaan|Santunan harian rawat inap',
   NULL, 5, 'ID', 'IDR');

-- ── Philippines (PHP) ────────────────────────────────────────────────────────
INSERT INTO store_products (code, name, insurance_type, tagline, amount, billing_period, features, badge, sort_order, region, currency)
VALUES
  ('life_ph',
   'Life Shield Plus',
   'Life Insurance',
   'Secure your family''s financial future with comprehensive life coverage',
   2500.00, 'month',
   'PHP 5,000,000 life coverage|Accidental death benefit|Total & partial permanent disability',
   'Best Seller', 1, 'PH', 'PHP'),

  ('medical_ph',
   'MediShield Elite PH',
   'Medical Insurance',
   'Comprehensive hospital and surgical coverage across the Philippines',
   3800.00, 'month',
   'Up to PHP 2,000,000 per year|Accredited hospitals nationwide|Outpatient & specialist consultation',
   NULL, 2, 'PH', 'PHP'),

  ('motor_ph',
   'AutoProtect PH',
   'Motor Insurance',
   'Complete vehicle protection on Philippine roads',
   9500.00, 'year',
   'Third-party liability (CTPL)|Own damage & theft coverage|24/7 roadside assistance',
   NULL, 3, 'PH', 'PHP'),

  ('travel_ph',
   'TravelSafe PH',
   'Travel Insurance',
   'Peace of mind on every international journey from the Philippines',
   1200.00, 'trip',
   'Emergency medical expenses abroad|Trip cancellation & curtailment|Baggage loss & flight delay',
   NULL, 4, 'PH', 'PHP'),

  ('accident_ph',
   'Personal Accident PH',
   'Personal Accident',
   '24/7 protection against life''s unexpected accidents',
   1100.00, 'month',
   'Accidental death & disability benefit|Medical expense reimbursement|Hospital daily cash allowance',
   NULL, 5, 'PH', 'PHP');
