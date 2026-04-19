/**
 * Пример для отдельного проекта калькулятора (construction-xi-kohl).
 *
 * Не вставляйте SMETA_INGEST_SECRET в браузерный код — секрет утечёт.
 * Сделайте в том проекте server route (Route Handler), который добавляет
 * Authorization: Bearer … и проксирует на SLK.
 *
 * В Vercel (slk-finance) задайте:
 *   SMETA_INGEST_SECRET — длинная случайная строка
 *   SMETA_INGEST_USER_ID — id пользователя в таблице users (часто 1 для админа)
 *   SMETA_CORS_ORIGINS — при необходимости список origin через запятую
 */

export const SLK_SMETA_URL = 'https://slk-finance.vercel.app/api/smeta'

export async function saveEstimateToSlkExample(
  body: Record<string, unknown>,
  bearerSecret: string,
): Promise<Response> {
  return fetch(SLK_SMETA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerSecret}`,
    },
    body: JSON.stringify(body),
  })
}
