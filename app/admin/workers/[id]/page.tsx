import { sql } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkerPayoutsMonthPicker } from '@/components/worker-payouts-month-picker'
import { buildMonthSelectOptionsFromBounds, formatTransactionDateRu } from '@/lib/transaction-dates'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

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

const PAYOUT_CATEGORIES = [
  'ЗП',
  'Аванс',
  'Премия',
  'Зарплата работникам',
  'Аванс работникам',
  'Премия работникам',
] as const

function payoutKind(name: string | null): 'advance' | 'salary' | 'bonus' | 'other' {
  if (!name) return 'other'
  if (name === 'Аванс' || name === 'Аванс работникам') return 'advance'
  if (name === 'Премия' || name === 'Премия работникам') return 'bonus'
  if (name === 'ЗП' || name === 'Зарплата работникам') return 'salary'
  return 'other'
}

export default async function WorkerPayoutsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const workerId = Number(id)
  const sp = (await searchParams) ?? {}
  const monthRaw = typeof sp.month === 'string' ? sp.month : null
  const month = monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : 'all'

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
      AND c.name = ANY(${PAYOUT_CATEGORIES as unknown as string[]})
  `
  const b = boundsRows?.[0] as { min_ym?: string | null; max_ym?: string | null } | undefined
  const monthOptions = buildMonthSelectOptionsFromBounds(b?.min_ym ?? null, b?.max_ym ?? null)

  const parsed = month === 'all' ? null : parseMonthParam(month)
  const mb = parsed ? monthBounds(parsed.y, parsed.m) : null

  const rows = mb
    ? await sql`
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
          AND c.name = ANY(${PAYOUT_CATEGORIES as unknown as string[]})
          AND t.created_at >= ${mb.start.toISOString()}
          AND t.created_at < ${mb.end.toISOString()}
        ORDER BY t.created_at DESC
      `
    : await sql`
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
          AND c.name = ANY(${PAYOUT_CATEGORIES as unknown as string[]})
        ORDER BY t.created_at DESC
      `

  const totals = (rows as Array<{ amount: number; category_name: string | null }>).reduce(
    (acc, r) => {
      const k = payoutKind(r.category_name)
      const amt = Number(r.amount) || 0
      acc.total += amt
      if (k === 'advance') acc.advance += amt
      if (k === 'salary') acc.salary += amt
      if (k === 'bonus') acc.bonus += amt
      return acc
    },
    { advance: 0, salary: 0, bonus: 0, total: 0 },
  )

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
        <Link href="/admin/workers" className="text-sm text-primary hover:underline">
          ← Назад к списку работников
        </Link>
      </div>

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader>
          <CardTitle>Итого за период</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Аванс</p>
            <p className="font-semibold tabular-nums">{formatCurrency(totals.advance)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ЗП</p>
            <p className="font-semibold tabular-nums">{formatCurrency(totals.salary)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Премия</p>
            <p className="font-semibold tabular-nums">{formatCurrency(totals.bonus)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Итого</p>
            <p className="font-semibold tabular-nums">{formatCurrency(totals.total)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader>
          <CardTitle>История выплат</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(rows as Array<{
            id: number
            amount: number
            created_at: string | Date
            description: string | null
            category_name: string | null
            wallet_name: string | null
          }>).length === 0 ? (
            <p className="text-sm text-muted-foreground">За период выплат нет.</p>
          ) : (
            <div className="space-y-2">
              {(rows as any[]).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-1 rounded-2xl border border-border bg-secondary/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {r.category_name ?? 'Выплата'} · {formatTransactionDateRu(r.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.wallet_name ? `Кошелёк: ${r.wallet_name}` : 'Кошелёк: —'}
                      {r.description ? ` · ${r.description}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(Number(r.amount) || 0)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

