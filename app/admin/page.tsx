import { sql } from '@/lib/db'
import { sumWalletsForDashboardTotal } from '@/lib/wallet-dashboard-total'
import { AdminDashboardShell } from '@/components/admin-dashboard-shell'
import { WalletCards } from '@/components/wallet-cards'
import { RecentTransactions } from '@/components/recent-transactions'
import { GoalProgress } from '@/components/goal-progress'
import type { DashboardAnalyticsData } from '@/components/dashboard-analytics'
import { buildMonthSelectOptionsFromBounds } from '@/lib/transaction-dates'

function defaultCalendarMonthKey(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function toYm(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Аналитика — необязательная часть дашборда. Если что-то падает в SQL
 * (например, мигрировали схему и колонки разъехались), не хочется
 * ронять всю страницу 500-кой: лучше показать KPI и кошельки,
 * а вместо графиков — пустые состояния.
 */
async function loadAnalytics(
  monthStart: Date,
  monthEnd: Date,
  cashflowStart: Date,
  defaultMonth: string,
  y: number,
  m: number,
): Promise<DashboardAnalyticsData> {
  const empty: DashboardAnalyticsData = {
    month: defaultMonth,
    cashflow: [],
    expensesByCategory: [],
    incomesByCategory: [],
    topCounterparties: [],
  }

  try {
    const [cashflowRows, expByCategoryRows, incByCategoryRows, topCounterpartyRows] =
      await Promise.all([
        sql`
          SELECT
            to_char(date_trunc('month', created_at), 'YYYY-MM') AS ym,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS expense
          FROM transactions
          WHERE created_at >= ${cashflowStart.toISOString()}
            AND created_at < ${monthEnd.toISOString()}
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        sql`
          SELECT c.name AS category, COALESCE(SUM(t.amount), 0)::float AS total
          FROM transactions t
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE t.type = 'expense'
            AND t.created_at >= ${monthStart.toISOString()}
            AND t.created_at < ${monthEnd.toISOString()}
          GROUP BY c.name
          ORDER BY total DESC
          LIMIT 10
        `,
        sql`
          SELECT c.name AS category, COALESCE(SUM(t.amount), 0)::float AS total
          FROM transactions t
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE t.type = 'income'
            AND t.created_at >= ${monthStart.toISOString()}
            AND t.created_at < ${monthEnd.toISOString()}
          GROUP BY c.name
          ORDER BY total DESC
          LIMIT 10
        `,
        sql`
          SELECT
            COALESCE(p.name, w.name, 'Без получателя') AS name,
            CASE WHEN p.id IS NOT NULL THEN 'partner'
                 WHEN w.id IS NOT NULL THEN 'worker'
                 ELSE 'other' END AS kind,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::float AS expense,
            COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0)::float AS income
          FROM transactions t
          LEFT JOIN partners p ON p.id = t.partner_id
          LEFT JOIN workers  w ON w.id = t.worker_id
          WHERE t.created_at >= ${monthStart.toISOString()}
            AND t.created_at < ${monthEnd.toISOString()}
            AND (t.partner_id IS NOT NULL OR t.worker_id IS NOT NULL)
          GROUP BY 1, 2
          ORDER BY expense DESC, income DESC
          LIMIT 10
        `,
      ])

    // Дозаполняем «дырявые» месяцы нулями, чтобы график был ровный по длине.
    const cashflowMap = new Map<string, { income: number; expense: number }>(
      cashflowRows.map((r: { ym: string; income: number; expense: number }) => [
        r.ym,
        { income: Number(r.income), expense: Number(r.expense) },
      ]),
    )
    const cashflow: DashboardAnalyticsData['cashflow'] = []
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, m - 1 - i, 1, 0, 0, 0, 0))
      const ym = toYm(dt)
      const v = cashflowMap.get(ym) ?? { income: 0, expense: 0 }
      cashflow.push({ ym, income: v.income, expense: v.expense, net: v.income - v.expense })
    }

    return {
      month: defaultMonth,
      cashflow,
      expensesByCategory: expByCategoryRows.map(
        (r: { category: string | null; total: number }) => ({
          category: r.category ?? 'Без категории',
          total: Number(r.total),
        }),
      ),
      incomesByCategory: incByCategoryRows.map(
        (r: { category: string | null; total: number }) => ({
          category: r.category ?? 'Без категории',
          total: Number(r.total),
        }),
      ),
      topCounterparties: topCounterpartyRows.map(
        (r: {
          name: string
          kind: 'partner' | 'worker' | 'other'
          expense: number
          income: number
        }) => ({
          name: r.name,
          kind: r.kind,
          expense: Number(r.expense),
          income: Number(r.income),
        }),
      ),
    }
  } catch (error) {
    console.error('dashboard analytics failed (showing empty fallback):', error)
    return empty
  }
}

async function getDashboardData() {
  const defaultMonth = defaultCalendarMonthKey()
  const [y, m] = defaultMonth.split('-').map(Number)
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  const cashflowStart = new Date(Date.UTC(y, m - 12, 1, 0, 0, 0, 0))

  const [wallets, transactions, debts, goals, bounds, monthStats, pendingRows, initialAnalytics] =
    await Promise.all([
      sql`SELECT * FROM wallets ORDER BY created_at DESC`,
      sql`
        SELECT t.*, c.name as category_name, w.name as wallet_name,
               p.name as partner_name, wr.name as worker_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN wallets w ON w.id = t.wallet_id
        LEFT JOIN partners p ON p.id = t.partner_id
        LEFT JOIN workers wr ON wr.id = t.worker_id
        ORDER BY t.created_at DESC
        LIMIT 10
      `,
      sql`SELECT * FROM debts WHERE is_paid = false ORDER BY created_at DESC`,
      sql`SELECT * FROM goals ORDER BY created_at DESC`,
      sql`
        SELECT 
          to_char(date_trunc('month', MIN(created_at)), 'YYYY-MM') as min_ym,
          to_char(date_trunc('month', MAX(created_at)), 'YYYY-MM') as max_ym
        FROM transactions
      `,
      sql`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
        FROM transactions
        WHERE created_at >= ${monthStart.toISOString()}
          AND created_at < ${monthEnd.toISOString()}
      `,
      sql`
        SELECT COUNT(*)::text as count
        FROM partner_requests
        WHERE status = 'pending'
      `,
      loadAnalytics(monthStart, monthEnd, cashflowStart, defaultMonth, y, m),
    ])

  const totalBalance = sumWalletsForDashboardTotal(
    wallets as { name: string; balance: number | string }[],
  )
  const totalDebtGiven = debts
    .filter((d: { type: string }) => d.type === 'given')
    .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount), 0)
  const totalDebtTaken = debts
    .filter((d: { type: string }) => d.type === 'taken')
    .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount), 0)

  const b = bounds[0]
  const monthOptions = buildMonthSelectOptionsFromBounds(b?.min_ym ?? null, b?.max_ym ?? null)

  const ms = monthStats[0]
  const initialIncome = Number(ms?.total_income ?? 0)
  const initialExpenses = Number(ms?.total_expenses ?? 0)
  const pendingRequests = Number(pendingRows[0]?.count ?? 0)

  return {
    wallets,
    transactions,
    goals,
    dashboard: {
      totalBalance,
      totalDebtGiven,
      totalDebtTaken,
      monthOptions,
      initialMonth: defaultMonth,
      initialIncome,
      initialExpenses,
      pendingRequests,
      initialAnalytics,
    },
  }
}

export default async function AdminDashboard() {
  const { wallets, transactions, goals, dashboard } = await getDashboardData()

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminDashboardShell
        totalBalance={dashboard.totalBalance}
        totalDebtGiven={dashboard.totalDebtGiven}
        totalDebtTaken={dashboard.totalDebtTaken}
        pendingRequests={dashboard.pendingRequests}
        monthOptions={dashboard.monthOptions}
        initialMonth={dashboard.initialMonth}
        initialIncome={dashboard.initialIncome}
        initialExpenses={dashboard.initialExpenses}
        initialAnalytics={dashboard.initialAnalytics}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <WalletCards wallets={wallets} />
        <GoalProgress goals={goals} />
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  )
}
