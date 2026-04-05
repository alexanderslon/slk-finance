-- Seed data for Sarafan

-- Admin user (login: slk, password: 31337)
INSERT INTO users (username, password_hash, role, status) 
VALUES ('slk', 'dev-will-overwrite-on-login', 'admin', 'approved')
ON CONFLICT (username) DO NOTHING;

-- Default wallets
INSERT INTO wallets (name, balance, currency) VALUES
('Наличка', 0, 'RUB'),
('Райфайзен', 0, 'RUB'),
('ОЗОН', 0, 'RUB'),
('ВТБ', 0, 'RUB')
ON CONFLICT DO NOTHING;

-- Default categories
INSERT INTO categories (name, type) VALUES
('Зарплата', 'income'),
('Фриланс', 'income'),
('Инвестиции', 'income'),
('Возврат', 'income'),
('Другое', 'income'),
('Материалы', 'expense'),
('ЗП', 'expense'),
('Аванс', 'expense'),
('Премия', 'expense'),
('Откат', 'expense'),
('Еда', 'expense'),
('Транспорт', 'expense'),
('Связь', 'expense'),
('Другое', 'expense')
ON CONFLICT DO NOTHING;

-- Sample workers
INSERT INTO workers (name, phone, position) VALUES
('Иванов Петр Сергеевич', '+7 (999) 123-45-67', 'Плиточник'),
('Сидоров Алексей Владимирович', '+7 (999) 234-56-78', 'Сантехник'),
('Козлов Дмитрий Андреевич', '+7 (999) 345-67-89', 'Электрик')
ON CONFLICT DO NOTHING;

-- Sample partners
INSERT INTO partners (name, phone, email) VALUES
('Партнер 1', '+7 (999) 111-22-33', 'partner1@example.com')
ON CONFLICT DO NOTHING;

-- Sample partner user: логин = телефон как в partners.phone, пароль 31337 (тот же SHA-256, что в lib/auth.ts)
INSERT INTO partner_users (partner_id, username, password_hash, is_active)
SELECT
  p.id,
  p.phone,
  '78de47dc208df623042d4803741b4ff50299c1ff5b4d32384ea77b6ee452069f',
  TRUE
FROM partners p
WHERE p.name = 'Партнер 1'
ON CONFLICT (username) DO NOTHING;
