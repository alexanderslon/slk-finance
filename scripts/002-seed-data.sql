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

-- Уникальность пары (name, type) — это критически важно: без неё ON CONFLICT
-- ниже становится no-op'ом, и категории при повторном запуске сидинга
-- задваиваются. Создаём индекс ДО самого INSERT.
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_type_key ON categories (name, type);

-- Default categories. Названия выровнены с lib/categories.ts: на стороне
-- расходов выплаты работнику явно помечены, чтобы не путаться с одноимёнными
-- доходными категориями.
INSERT INTO categories (name, type) VALUES
('Зарплата', 'income'),
('Аванс', 'income'),
('Премия', 'income'),
('Фриланс', 'income'),
('Подработка', 'income'),
('Инвестиции', 'income'),
('Дивиденды', 'income'),
('Возврат', 'income'),
('Бонус', 'income'),
('Подарок', 'income'),
('Аренда', 'income'),
('Продажа', 'income'),
('Крипта', 'income'),
('Другое', 'income'),
('Материалы', 'expense'),
('Зарплата работникам', 'expense'),
('Аванс работникам', 'expense'),
('Премия работникам', 'expense'),
('Подрядчики', 'expense'),
('Откат', 'expense'),
('Инструмент', 'expense'),
('Аренда', 'expense'),
('Транспорт', 'expense'),
('Топливо', 'expense'),
('Доставка', 'expense'),
('Связь и интернет', 'expense'),
('Реклама', 'expense'),
('Налоги и сборы', 'expense'),
('Еда', 'expense'),
('Хозтовары', 'expense'),
('Квартира и ЖКХ', 'expense'),
('Крипта', 'expense'),
('Другое', 'expense')
ON CONFLICT (name, type) DO NOTHING;

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
