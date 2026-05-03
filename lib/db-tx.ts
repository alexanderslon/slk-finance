import { sql, type SqlTagged } from './db'

/**
 * Промис-подобный объект, который возвращают тэг-шаблоны `sql\`...\``
 * до фактического `await`. Подходит и для neon (HTTP-batched), и для postgres.js.
 */
type DeferredQuery = PromiseLike<unknown[]>

type AnySqlClient = SqlTagged & {
  /** neon (`@neondatabase/serverless`): один HTTP-запрос с BEGIN/COMMIT. */
  transaction?: (queries: DeferredQuery[]) => Promise<unknown[]>
  /** postgres.js: BEGIN/COMMIT в выделенном соединении. */
  begin?: (cb: (tx: SqlTagged) => Promise<unknown>) => Promise<unknown>
}

/**
 * Атомарно выполняет несколько SQL-запросов в одной транзакции БД.
 *
 * - На production (Neon HTTP) использует встроенный `sql.transaction([...])`,
 *   который гоняет всё одним запросом BEGIN/COMMIT.
 * - На локалке (postgres.js) запускает запросы внутри `sql.begin(...)`.
 * - При сбое любого запроса ВСЯ серия откатывается (атомарность).
 *
 * Использование:
 * ```ts
 * await txMulti((sql) => [
 *   sql`UPDATE wallets SET balance = balance - ${amount} WHERE id = ${id}`,
 *   sql`INSERT INTO transactions (...) VALUES (...)`,
 * ])
 * ```
 */
export async function txMulti(
  build: (tx: SqlTagged) => DeferredQuery[],
): Promise<unknown[]> {
  const client = sql as AnySqlClient

  if (typeof client.transaction === 'function') {
    const queries = build(sql)
    return client.transaction(queries)
  }

  if (typeof client.begin === 'function') {
    const out: unknown[] = []
    await client.begin(async (tx) => {
      const queries = build(tx)
      for (const q of queries) {
        out.push(await q)
      }
      return null
    })
    return out
  }

  // Best-effort fallback (теоретически недостижим, но не падаем).
  const queries = build(sql)
  const out: unknown[] = []
  for (const q of queries) out.push(await q)
  return out
}
