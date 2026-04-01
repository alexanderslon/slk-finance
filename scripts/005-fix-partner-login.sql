-- Демо-партнёр: был password_hash = 'dev-only'; логин в форме — телефон, а в БД мог быть partner1
-- Пароль после миграции: 31337. Run: psql "$DATABASE_URL" -f scripts/005-fix-partner-login.sql

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
