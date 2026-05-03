'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, PieChart as PieIcon, Users } from 'lucide-react'
import { transactionMonthTitleRu } from '@/lib/transaction-dates'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type CashflowPoint = { ym: string; income: number; expense: number; net: number }
type CategoryPoint = { category: string; total: number }
type CounterpartyPoint = {
  name: string
  kind: 'partner' | 'worker' | 'other'
  expense: number
  income: number
}

export type DashboardAnalyticsData = {
  month: string
  cashflow: CashflowPoint[]
  expensesByCategory: CategoryPoint[]
  incomesByCategory: CategoryPoint[]
  topCounterparties: CounterpartyPoint[]
}

const CATEGORY_COLORS = [
  'oklch(0.55 0.18 145)',
  'oklch(0.55 0.18 200)',
  'oklch(0.6 0.18 25)',
  'oklch(0.7 0.15 80)',
  'oklch(0.55 0.15 300)',
  'oklch(0.55 0.18 260)',
  'oklch(0.6 0.18 320)',
  'oklch(0.55 0.18 100)',
  'oklch(0.55 0.18 170)',
  'oklch(0.55 0.18 50)',
]

function formatCompactRub(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)} млн`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)} тыс`
  return new Intl.NumberFormat('ru-RU').format(Math.round(value))
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function shortMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  if (!y || !m) return yyyyMm
  // Показываем год только в январе и в самом первом столбце — экономим место.
  return format(new Date(y, m - 1, 1), m === 1 ? "LLL ''yy" : 'LLL', { locale: ru })
}

type CashflowTooltipPayloadEntry = {
  name?: string | number
  dataKey?: string | number
  color?: string
  value?: number
}

function CashflowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: CashflowTooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const ym = String(label ?? '')
  const income = Number(payload.find((p) => p.dataKey === 'income')?.value ?? 0)
  const expense = Number(payload.find((p) => p.dataKey === 'expense')?.value ?? 0)
  const net = income - expense
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold capitalize">{transactionMonthTitleRu(ym)}</p>
      <p className="mt-1 tabular-nums text-success">+{formatCurrency(income)}</p>
      <p className="tabular-nums text-destructive">−{formatCurrency(expense)}</p>
      <p
        className={cn(
          'mt-1 border-t border-border/50 pt-1 font-semibold tabular-nums',
          net >= 0 ? 'text-success' : 'text-destructive',
        )}
      >
        Нетто: {net >= 0 ? '+' : ''}
        {formatCurrency(net)}
      </p>
    </div>
  )
}

function CategoryTooltip({
  active,
  payload,
  totalAll,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; payload?: CategoryPoint }[]
  totalAll: number
}) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0]
  const name = entry.name ?? entry.payload?.category ?? ''
  const total = Number(entry.value ?? entry.payload?.total ?? 0)
  const pct = totalAll > 0 ? (total / totalAll) * 100 : 0
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold">{name}</p>
      <p className="mt-1 tabular-nums">{formatCurrency(total)}</p>
      <p className="text-muted-foreground tabular-nums">{pct.toFixed(1)}% от итога</p>
    </div>
  )
}

export function DashboardAnalytics({
  initialData,
  month,
}: {
  initialData: DashboardAnalyticsData
  month: string
}) {
  const [data, setData] = useState<DashboardAnalyticsData>(initialData)
  const [loading, setLoading] = useState(false)

  // При смене месяца на родителе — подгружаем свежий срез.
  useEffect(() => {
    if (month === initialData.month) {
      setData(initialData)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/stats/analytics?month=${encodeURIComponent(month)}`)
        if (!res.ok) return
        const json = (await res.json()) as DashboardAnalyticsData
        if (!cancelled) setData(json)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month, initialData])

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const expensesTotal = useMemo(
    () => data.expensesByCategory.reduce((s, x) => s + x.total, 0),
    [data.expensesByCategory],
  )
  const incomesTotal = useMemo(
    () => data.incomesByCategory.reduce((s, x) => s + x.total, 0),
    [data.incomesByCategory],
  )
  const counterpartiesMax = useMemo(
    () => data.topCounterparties.reduce((m, x) => Math.max(m, x.expense, x.income), 0),
    [data.topCounterparties],
  )

  const cashflowAxisMax = useMemo(() => {
    let m = 0
    for (const p of data.cashflow) {
      if (p.income > m) m = p.income
      if (p.expense > m) m = p.expense
    }
    return m
  }, [data.cashflow])

  return (
    <div
      className={cn(
        'grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3',
        loading && 'opacity-70 transition-opacity',
      )}
    >
      <Card className="rounded-3xl border-border bg-card xl:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Кэшфлоу за 12 месяцев
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              По {transactionMonthTitleRu(month)} включительно
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 text-[11px] sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-success" />
              Доходы
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-destructive" />
              Расходы
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-4">
          {data.cashflow.length === 0 || cashflowAxisMax === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              За 12 месяцев нет операций
            </p>
          ) : (
            <div className="h-[260px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.cashflow}
                  margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="ym"
                    tickFormatter={shortMonthLabel}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCompactRub(v)}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 11 }}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    content={<CashflowTooltip />}
                  />
                  <Bar dataKey="income" name="Доход" fill="var(--success)" radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="expense"
                    name="Расход"
                    fill="var(--destructive)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PieIcon className="h-5 w-5 text-destructive" />
            Расходы по категориям
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {transactionMonthTitleRu(month)} · {formatCurrency(expensesTotal)}
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-4">
          {data.expensesByCategory.length === 0 || expensesTotal === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Нет расходов за месяц</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CategoryTooltip totalAll={expensesTotal} />} />
                    <Pie
                      data={data.expensesByCategory}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={42}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {data.expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 space-y-1.5 text-sm">
                {data.expensesByCategory.slice(0, 5).map((c, i) => {
                  const pct = expensesTotal > 0 ? (c.total / expensesTotal) * 100 : 0
                  return (
                    <li key={c.category} className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground/90">{c.category}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="shrink-0 text-right font-semibold tabular-nums">
                        {formatCompactRub(c.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PieIcon className="h-5 w-5 text-success" />
            Доходы по категориям
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {transactionMonthTitleRu(month)} · {formatCurrency(incomesTotal)}
          </p>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-4">
          {data.incomesByCategory.length === 0 || incomesTotal === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Нет доходов за месяц</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CategoryTooltip totalAll={incomesTotal} />} />
                    <Pie
                      data={data.incomesByCategory}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={42}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {data.incomesByCategory.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 space-y-1.5 text-sm">
                {data.incomesByCategory.slice(0, 5).map((c, i) => {
                  const pct = incomesTotal > 0 ? (c.total / incomesTotal) * 100 : 0
                  return (
                    <li key={c.category} className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground/90">{c.category}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="shrink-0 text-right font-semibold tabular-nums">
                        {formatCompactRub(c.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border bg-card xl:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-5 w-5 text-primary" />
            Топ контрагентов за месяц
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Партнёры и работники с наибольшими операциями за {transactionMonthTitleRu(month)}
          </p>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-5">
          {data.topCounterparties.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              За месяц нет операций с партнёрами/работниками
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.topCounterparties.map((c) => {
                const sum = c.expense + c.income
                const widthExpense =
                  counterpartiesMax > 0 ? (c.expense / counterpartiesMax) * 100 : 0
                const widthIncome =
                  counterpartiesMax > 0 ? (c.income / counterpartiesMax) * 100 : 0
                const kindLabel =
                  c.kind === 'partner' ? 'партнёр' : c.kind === 'worker' ? 'работник' : ''
                return (
                  <li key={`${c.kind}-${c.name}`} className="min-w-0">
                    <div className="flex min-w-0 items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                        {kindLabel ? (
                          <p className="text-[11px] text-muted-foreground">{kindLabel}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(sum)}
                      </p>
                    </div>
                    <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      {c.expense > 0 ? (
                        <span
                          className="block h-full bg-destructive"
                          style={{ width: `${widthExpense}%` }}
                          title={`Расход: ${formatCurrency(c.expense)}`}
                        />
                      ) : null}
                      {c.income > 0 ? (
                        <span
                          className="block h-full bg-success"
                          style={{ width: `${widthIncome}%` }}
                          title={`Доход: ${formatCurrency(c.income)}`}
                        />
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
