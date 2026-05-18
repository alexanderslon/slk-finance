import { sql } from '@/lib/db'
import Link from 'next/link'
import { WorkerPayoutsMonthPicker } from '@/components/worker-payouts-month-picker'
import { WorkerPayoutsView } from '@/components/worker-payouts-view'
import {
  buildMonthSelectOptionsFromBounds,
  currentCalendarMonthKey,
  transactionMonthTitleRu,
} from '@/lib/transaction-dates'
import type { WorkerPayoutTx } from '@/lib/worker-payouts'

export const dynamic = 'force-dynamic'

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

function resolveMonthFilter(monthRaw: string | null | undefined): string {
  if (monthRaw === 'all') return 'all'
  if (monthRaw && /^\d{4}-\d{2}$/.test(monthRaw)) return monthRaw
  return currentCalendarMonthKey()
}

export default async function WorkerPayoutsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { id } = params
  const workerId = Number(id)
  const sp = searchParams ?? {}
  const monthRaw = typeof sp.month === 'string' ? sp.month : undefined
  const month = resolveMonthFilter(monthRaw)

  const wRows = await sql`SELECT * FROM workers WHERE id = ${workerId} LIMIT 1`
  const worker = wRows[0] as { id: number; name: string; position?: string | null } | undefined
  if (!worker) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <p className="text-sm text-muted-foreground">Работник не найден.</p>
        <Link href="/admin/workers" className="text-sm text-primary hover:underline">
          ← Назад к списку работников
        </Link>
      </div>
    )
  }

  const boundsRows = await sql`
    SELECT
      to_char(date_trunc('month', MIN(t.created_at)), 'YYYY-MM') AS min_ym,
      to_char(date_trunc('month', MAX(t.created_at)), 'YYYY-MM') AS max_ym
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND t.worker_id = ${workerId}
      AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')
  `
  const b = boundsRows?.[0] as { min_ym?: string | null; max_ym?: string | null } | undefined
  const monthOptionsBase = buildMonthSelectOptionsFromBounds(b?.min_ym ?? null, b?.max_ym ?? null)
  const monthOptions =
    month !== 'all' && !monthOptionsBase.includes(month) ? [month, ...monthOptionsBase] : monthOptionsBase

  const parsed = month === 'all' ? null : parseMonthParam(month)
  const mb = parsed ? monthBounds(parsed.y, parsed.m) : null

  const rows = (await (mb
    ? sql`
        SELECT
          t.id,
          t.amount,
          t.created_at,
          t.description,
          c.name AS category_name,
          w.name AS wallet_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN wallets w ON w.id = t.wallet_id
        WHERE t.type = 'expense'
          AND t.worker_id = ${workerId}
          AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')
          AND t.created_at >= ${mb.start.toISOString()}
          AND t.created_at < ${mb.end.toISOString()}
        ORDER BY t.created_at DESC
      `
    : sql`
        SELECT
          t.id,
          t.amount,
          t.created_at,
          t.description,
          c.name AS category_name,
          w.name AS wallet_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN wallets w ON w.id = t.wallet_id
        WHERE t.type = 'expense'
          AND t.worker_id = ${workerId}
          AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')
        ORDER BY t.created_at DESC
      `)) as WorkerPayoutTx[]

  const monthlyAgg =
    month === 'all'
      ? await sql`
          SELECT
            to_char(date_trunc('month', t.created_at), 'YYYY-MM') AS ym,
            COALESCE(SUM(CASE WHEN c.name IN ('Аванс', 'Аванс работникам') THEN t.amount ELSE 0 END), 0)::float AS advance,
            COALESCE(SUM(CASE WHEN c.name IN ('ЗП', 'Зарплата работникам') THEN t.amount ELSE 0 END), 0)::float AS salary,
            COALESCE(SUM(CASE WHEN c.name IN ('Премия', 'Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS bonus,
            COALESCE(SUM(t.amount), 0)::float AS total
          FROM transactions t
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE t.type = 'expense'
            AND t.worker_id = ${workerId}
            AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')
          GROUP BY 1
          ORDER BY 1 DESC
        `
      : []

  const monthlyBreakdown = monthlyAgg as Array<{
    ym: string
    advance: number
    salary: number
    bonus: number
    total: number
  }>

  const periodLabel =
    month === 'all' ? 'За всё время' : transactionMonthTitleRu(month)
  const summaryTitle =
    month === 'all' ? 'Итого за всё время' : `Итого за ${transactionMonthTitleRu(month)}`

  const workersListHref =
    month === 'all' ? '/admin/workers?month=all' : `/admin/workers?month=${encodeURIComponent(month)}`

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">{worker.name}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Выплаты работнику · {worker.position || '—'}
            </p>
          </div>
          <WorkerPayoutsMonthPicker monthOptions={monthOptions} value={month} />
        </div>
        <Link href={workersListHref} className="text-sm text-primary hover:underline">
          ← Назад к списку работников
        </Link>
      </div>

      <WorkerPayoutsView
        rows={rows}
        periodLabel={periodLabel}
        summaryTitle={summaryTitle}
        showMonthColumn={month === 'all'}
        monthlyBreakdown={month === 'all' ? monthlyBreakdown : undefined}
      />
    </div>
  )
}
