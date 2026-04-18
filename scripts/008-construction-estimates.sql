-- Сметы (калькулятор строительных работ) — JSON состояние + привязка к админ-пользователю

CREATE TABLE IF NOT EXISTS construction_estimates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_construction_estimates_user_updated
  ON construction_estimates(user_id, updated_at DESC);
