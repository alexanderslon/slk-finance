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
  work_comment TEXT,
  customer_phone VARCHAR(50) NOT NULL,
  address TEXT,
  square_meters DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
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
