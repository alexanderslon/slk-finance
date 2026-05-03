import { createHash, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

function hashToken(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest()
}

/** Сравнение секрета без утечки по времени (через хэш фиксированной длины). */
export function smetaSecretsEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return timingSafeEqual(hashToken(a), hashToken(b))
  } catch {
    return false
  }
}

/** POST от внешнего калькулятора: Authorization: Bearer <SMETA_INGEST_SECRET> */
export function isSmetaIngestAuthorized(request: NextRequest): boolean {
  const secret = process.env.SMETA_INGEST_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (!auth?.toLowerCase().startsWith('bearer ')) return false
  const token = auth.slice(7).trim()
  return smetaSecretsEqual(token, secret)
}

/**
 * Кому записать смету при внешнем ingest.
 *
 * Безопасность: env `SMETA_INGEST_USER_ID` имеет приоритет. Тело запроса
 * (`created_by`) учитывается, ТОЛЬКО когда env не задан — нужно для миграций
 * и dev-сценариев, когда секрет ещё не привязан к конкретному админу.
 *
 * Раньше тело перебивало env: при компрометации секрета можно было писать
 * сметы под любым `user_id` из таблицы `users`. Закрыто.
 */
export function requireIngestUserId(bodyCreatedBy: unknown): number | null {
  const fromEnv = process.env.SMETA_INGEST_USER_ID?.trim()
  const parsedEnv = fromEnv ? Number(fromEnv) : NaN
  if (Number.isFinite(parsedEnv) && parsedEnv > 0) return parsedEnv

  const parsedBody =
    typeof bodyCreatedBy === 'number' && Number.isFinite(bodyCreatedBy)
      ? bodyCreatedBy
      : typeof bodyCreatedBy === 'string' && bodyCreatedBy.trim()
        ? Number(bodyCreatedBy.trim())
        : NaN
  return Number.isFinite(parsedBody) && parsedBody > 0 ? parsedBody : null
}
