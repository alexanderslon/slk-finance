-- =============================================================================
-- Sarafan — один раз вставьте ВЕСЬ этот файл в Neon → SQL Editor → Run
-- (содержимое файла, а не путь scripts/...)
-- Порядок: схема → сиды → выравнивание → legacy-пароли (только если есть колонка password) → фиксы партнёра → квадратура
-- =============================================================================

-- --- 001-create-tables.sql --------------------------------------------------

-- Sarafan schema (matches the app code)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'partner')),
  status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  bonus_balance DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'partner')),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  balance DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'RUB',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  bonus_balance DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_users (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  salary DECIMAL(12, 2),
  salary_paid DECIMAL(12, 2) DEFAULT 0,
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partner_requests (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  work_volume TEXT,
  recommended_specialist TEXT,
  work_comment TEXT,
  customer_phone VARCHAR(50) NOT NULL,
  address TEXT,
  square_meters DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  actual_work_volume TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debts (
  id SERIAL PRIMARY KEY,
  debtor_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('given', 'taken')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  due_date DATE,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- 002-seed-data.sql ------------------------------------------------------

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

-- --- 003-align-users-table.sql ----------------------------------------------

-- Fix: column "username" of relation "users" does not exist (old DB vs app code)

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE 'UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL';
  END IF;
END $$;

UPDATE users SET username = 'user_' || id::text WHERE username IS NULL OR TRIM(COALESCE(username, '')) = '';

CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);

-- --- 004 + безопасно для НОВОЙ БД (нет колонки password) ---------------------

-- Legacy: если в users была колонка password (plain text), переносим в password_hash.
-- На свежей схеме из 001 колонки password нет — блок просто пропускается.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
  ) THEN
    UPDATE users
    SET password_hash = encode(digest(password || 'slk-finance-salt', 'sha256'), 'hex')
    WHERE password IS NOT NULL
      AND TRIM(password) <> ''
      AND (password_hash IS NULL OR TRIM(COALESCE(password_hash, '')) = '');
  END IF;
END $$;

UPDATE users SET status = COALESCE(NULLIF(TRIM(status), ''), 'approved') WHERE status IS NULL;

-- --- 005-fix-partner-login.sql ----------------------------------------------

UPDATE partner_users
SET
  password_hash = '78de47dc208df623042d4803741b4ff50299c1ff5b4d32384ea77b6ee452069f',
  is_active = TRUE
WHERE password_hash IN ('dev-only', 'dev-will-overwrite');

UPDATE partner_users pu
SET username = TRIM(p.phone)
FROM partners p
WHERE pu.partner_id = p.id
  AND pu.username = 'partner1'
  AND p.phone IS NOT NULL
  AND TRIM(p.phone) <> '';

-- --- 006-partner-requests-square-meters.sql ---------------------------------

ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS square_meters DECIMAL(12, 2);

-- --- 007-partner-requests-actual-work-volume.sql ----------------------------

ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS actual_work_volume TEXT;

-- =============================================================================
-- Готово. Дальше: Vercel → DATABASE_URL (Pooled), затем POST /api/setup с Bearer SETUP_SECRET
-- чтобы выставить пароль админа slk = 31337 (или смените пароль в приложении).
-- =============================================================================
