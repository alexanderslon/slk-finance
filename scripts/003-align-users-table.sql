-- Fix: column "username" of relation "users" does not exist (old DB vs app code)
-- Run: psql "$DATABASE_URL" -f scripts/003-align-users-table.sql

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
