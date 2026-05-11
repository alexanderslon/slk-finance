import { sql } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkerPayoutsMonthPicker } from '@/components/worker-payouts-month-picker'
import {
  buildMonthSelectOptionsFromBounds,
  formatTransactionDateRu,
  transactionMonthKey,
  transactionMonthTitleRu,
} from '@/lib/transaction-dates'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

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

type TxRow = {
  id: number
  amount: number
  created_at: string | Date
  description: string | null
  category_name: string | null
  wallet_name: string | null
}

function payoutKind(name: string | null): 'advance' | 'salary' | 'bonus' | 'other' {
  if (!name) return 'other'
  if (name === 'Аванс' || name === 'Аванс работникам') return 'advance'
  if (name === 'Премия' || name === 'Премия работникам') return 'bonus'
  if (name === 'ЗП' || name === 'Зарплата работникам') return 'salary'
  return 'other'
}

function payoutKindLabel(kind: ReturnType<typeof payoutKind>): string {
  switch (kind) {
    case 'advance':
      return 'Аванс'
    case 'salary':
      return 'Зарплата'
    case 'bonus':
      return 'Премия'
    default:
      return 'Прочее'
  }
}

function totalsFrom(rows: TxRow[]) {
  return rows.reduce(
    (acc, r) => {
      const k = payoutKind(r.category_name)
      const amt = Number(r.amount) || 0
      acc.total += amt
      if (k === 'advance') acc.advance += amt
      if (k === 'salary') acc.salary += amt
      if (k === 'bonus') acc.bonus += amt
      if (k === 'other') acc.other += amt
      return acc
    },
    { advance: 0, salary: 0, bonus: 0, other: 0, total: 0 },
  )
}

function groupRowsByMonth(rows: TxRow[]): Map<string, TxRow[]> {
  const map = new Map<string, TxRow[]>()
  for (const r of rows) {
    const k = transactionMonthKey(r.created_at)
    const list = map.get(k) ?? []
    list.push(r)
    map.set(k, list)
  }
  // новые месяцы сверху
  const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))
  const sorted = new Map<string, TxRow[]>()
  for (const k of keys) {
    sorted.set(
      k,
      (map.get(k) ?? []).sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)),
      ),
    )
  }
  return sorted
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
      `)) as TxRow[]

  const periodTotals = totalsFrom(rows)

  const monthlyAgg = await sql`
    SELECT
      to_char(date_trunc('month', t.created_at), 'YYYY-MM') AS ym,
      COALESCE(SUM(CASE WHEN c.name IN ('Аванс', 'Аванс работникам') THEN t.amount ELSE 0 END), 0)::float AS advance,
      COALESCE(SUM(CASE WHEN c.name IN ('ЗП', 'Зарплата работникам') THEN t.amount ELSE 0 END), 0)::float AS salary,
      COALESCE(SUM(CASE WHEN c.name IN ('Премия', 'Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS bonus,
      COALESCE(SUM(CASE WHEN c.name NOT IN ('Аванс', 'Аванс работникам', 'ЗП', 'Зарплата работникам', 'Премия', 'Премия работникам') THEN t.amount ELSE 0 END), 0)::float AS other,
      COALESCE(SUM(t.amount), 0)::float AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND t.worker_id = ${workerId}
      AND c.name IN ('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')
    GROUP BY 1
    ORDER BY 1 DESC
  `
  const monthlyRows = monthlyAgg as Array<{
    ym: string
    advance: number
    salary: number
    bonus: number
    other: number
    total: number
  }>

  const grouped = groupRowsByMonth(rows)
  const periodLabel =
    month === 'all' ? 'за всё время' : transactionMonthTitleRu(month)

  const payoutBlocks: ReactNode[] = []
  for (const [ym, group] of grouped) {
    const blockTotal = group.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    payoutBlocks.push(
      <div key={ym} className="min-w-0">
        <div className="mb-3 flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
          <h3 className="text-base font-semibold text-foreground">{transactionMonthTitleRu(ym)}</h3>
          <span className="text-sm font-medium tabular-nums text-destructive">
            Итого: −{formatCurrency(blockTotal)}
          </span>
        </div>

        {/* mobile */}
        <div className="space-y-2 lg:hidden">
          {group.map((r) => {
            const kind = payoutKind(r.category_name)
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatTransactionDateRu(r.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payoutKindLabel(kind)}
                      {r.category_name ? ` · ${r.category_name}` : ''}
                    </p>
                    {r.wallet_name ? (
                      <p className="mt-1 text-xs text-muted-foreground">Кошелёк: {r.wallet_name}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
                    −{formatCurrency(Number(r.amount) || 0)}
                  </span>
                </div>
                {r.description ? (
                  <p className="mt-2 wrap-break-word text-xs text-muted-foreground">{r.description}</p>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* desktop */}
        <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[7.5rem]">Дата</TableHead>
                <TableHead>Тип выплаты</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Кошелёк</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead className="text-right tabular-nums">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.map((r) => {
                const kind = payoutKind(r.category_name)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatTransactionDateRu(r.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{payoutKindLabel(kind)}</TableCell>
                    <TableCell>{r.category_name ?? '—'}</TableCell>
                    <TableCell>{r.wallet_name ?? '—'}</TableCell>
                    <TableCell className="max-w-[260px] wrap-break-word text-muted-foreground">
                      {r.description?.trim() || '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-destructive">
                      −{formatCurrency(Number(r.amount) || 0)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>,
    )
  }

  const summaryAll = monthlyRows.reduce(
    (acc, r) => {
      acc.advance += Number(r.advance) || 0
      acc.salary += Number(r.salary) || 0
      acc.bonus += Number(r.bonus) || 0
      acc.other += Number(r.other) || 0
      acc.total += Number(r.total) || 0
      return acc
    },
    { advance: 0, salary: 0, bonus: 0, other: 0, total: 0 },
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
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle className="text-lg sm:text-xl">Выплаты</CardTitle>
            <span className="text-sm tabular-nums text-muted-foreground">Период: {periodLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 overflow-x-hidden">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">За выбранный период выплат нет.</p>
          ) : (
            <>
              <div className="space-y-8 sm:space-y-10">{payoutBlocks}</div>

              <div className="border-t border-border pt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Итого за выбранный период
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-muted-foreground">Аванс</p>
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(periodTotals.advance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Зарплата</p>
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(periodTotals.salary)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Премия</p>
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(periodTotals.bonus)}
                    </p>
                  </div>
                  {periodTotals.other > 0 ? (
                    <div>
                      <p className="text-muted-foreground">Прочее</p>
                      <p className="font-semibold tabular-nums text-destructive">
                        −{formatCurrency(periodTotals.other)}
                      </p>
                    </div>
                  ) : null}
                  <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                    <p className="text-muted-foreground">Всего выплачено</p>
                    <p className="text-lg font-bold tabular-nums text-destructive">
                      −{formatCurrency(periodTotals.total)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader>
          <CardTitle>Разбивка по месяцам (все выплаты)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Сводка по всем выплатам работнику, не зависит от фильтра месяца выше.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {monthlyRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет данных по выплатам.</p>
          ) : (
            <>
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Месяц</TableHead>
                    <TableHead className="text-right tabular-nums">Аванс</TableHead>
                    <TableHead className="text-right tabular-nums">Зарплата</TableHead>
                    <TableHead className="text-right tabular-nums">Премия</TableHead>
                    <TableHead className="text-right tabular-nums">Итого</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRows.map((m) => (
                    <TableRow key={m.ym}>
                      <TableCell className="font-medium">{transactionMonthTitleRu(m.ym)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{formatCurrency(Number(m.advance) || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{formatCurrency(Number(m.salary) || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{formatCurrency(Number(m.bonus) || 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-destructive">
                        −{formatCurrency(Number(m.total) || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Всего за всё время
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-muted-foreground">Аванс</p>
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(summaryAll.advance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Зарплата</p>
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(summaryAll.salary)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Премия</p>
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(summaryAll.bonus)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Всего</p>
                    <p className="text-lg font-bold tabular-nums text-destructive">
                      −{formatCurrency(summaryAll.total)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
