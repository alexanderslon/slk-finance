-- Фактический объём работ (фиксирует админ при одобрении / отклонении)
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS actual_work_volume TEXT;
