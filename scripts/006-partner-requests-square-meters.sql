-- Необязательная квадратура объекта (м²) в заявке партнёра
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS square_meters DECIMAL(12, 2);
