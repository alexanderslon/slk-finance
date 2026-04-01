-- Legacy `users` had plain `password` text; app expects `password_hash` (SHA-256 of password + PASSWORD_SALT default 'slk-finance-salt')
-- Requires pgcrypto (available on Neon). Run: psql "$DATABASE_URL" -f scripts/004-users-password-hash-from-legacy.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'approved';

UPDATE users
SET password_hash = encode(digest(password || 'slk-finance-salt', 'sha256'), 'hex')
WHERE password IS NOT NULL
  AND TRIM(password) <> ''
  AND (password_hash IS NULL OR TRIM(COALESCE(password_hash, '')) = '');

UPDATE users SET status = COALESCE(NULLIF(TRIM(status), ''), 'approved') WHERE status IS NULL;
