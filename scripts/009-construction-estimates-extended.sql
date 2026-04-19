-- Расширение construction_estimates: поля для внешнего калькулятора и денормализация.
-- Выполнить в Neon после 008, если этих колонок ещё нет.

ALTER TABLE construction_estimates
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(512) DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(512) DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(128) DEFAULT '',
  ADD COLUMN IF NOT EXISTS square_meters NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(16, 2),
  ADD COLUMN IF NOT EXISTS prepayment NUMERIC(16, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data JSONB,
  ADD COLUMN IF NOT EXISTS partner_request_id INTEGER REFERENCES partner_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_construction_estimates_partner_request
  ON construction_estimates(partner_request_id)
  WHERE partner_request_id IS NOT NULL;
