import { sql } from '@/lib/db'
import { WorkersManager } from '@/components/workers-manager'
import { WorkersMonthPicker } from '@/components/workers-month-picker'
import { buildMonthSelectOptionsFromBounds } from '@/lib/transaction-dates'

function parseMonthParam(raw: string | null): { y: number; m: number } | null {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null
  const y = Number(raw.slice(0, 4))
  const m = Number(raw.slice(5, 7))
  if (m < 1 || m > 12) return null
  return { y, m }
}

function monthBounds(y: number, m: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  return { start, end }
}

async function getWorkers(month: string | null) {
  const parsed = parseMonthParam(month)
  const bounds = parsed ? monthBounds(parsed.y, parsed.m) : null
  const start = bounds?.start ?? null
  const end = bounds?.end ?? null

  if (!start || !end) {
    return await sql`
      SELECT
        w.*,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('ЗП', 'Зарплата работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_salary,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('Аванс', 'Аванс работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_advance,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('Премия', 'Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_bonus,
        COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_total
      FROM workers w
      LEFT JOIN transactions t ON t.worker_id = w.id
      LEFT JOIN categories c ON c.id = t.category_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `
  }

  return await sql`
    SELECT
      w.*,
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('ЗП', 'Зарплата работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_salary,
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('Аванс', 'Аванс работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_advance,
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('Премия', 'Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_bonus,
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS paid_total
    FROM workers w
    LEFT JOIN transactions t
      ON t.worker_id = w.id
     AND t.created_at >= ${start.toISOString()}
     AND t.created_at < ${end.toISOString()}
    LEFT JOIN categories c ON c.id = t.category_id
    GROUP BY w.id
    ORDER BY w.created_at DESC
  `
}

async function getPayoutMonthBounds() {
  const rows = await sql`
    SELECT
      to_char(date_trunc('month', MIN(t.created_at)), 'YYYY-MM') AS min_ym,
      to_char(date_trunc('month', MAX(t.created_at)), 'YYYY-MM') AS max_ym
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND t.worker_id IS NOT NULL
      AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')
  `
  return rows?.[0] as { min_ym?: string | null; max_ym?: string | null } | undefined
}

export default async function WorkersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const sp = searchParams ?? {}
  const monthRaw = typeof sp.month === 'string' ? sp.month : null

  const bounds = await getPayoutMonthBounds()
  const monthOptions = buildMonthSelectOptionsFromBounds(bounds?.min_ym ?? null, bounds?.max_ym ?? null)
  const month = monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : 'all'

  const workers = await getWorkers(month === 'all' ? null : month)

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Работники</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground sm:text-base">Управление сотрудниками</p>
          <WorkersMonthPicker monthOptions={monthOptions} value={month} />
        </div>
      </div>

      <WorkersManager initialWorkers={workers} />
    </div>
  )
}
