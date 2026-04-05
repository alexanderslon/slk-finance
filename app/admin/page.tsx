import { sql } from '@/lib/db'
import { DashboardStats } from '@/components/dashboard-stats'
import { WalletCards } from '@/components/wallet-cards'
import { RecentTransactions } from '@/components/recent-transactions'
import { GoalProgress } from '@/components/goal-progress'
import { buildMonthSelectOptionsFromBounds } from '@/lib/transaction-dates'

function defaultCalendarMonthKey(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

async function getDashboardData() {
  const defaultMonth = defaultCalendarMonthKey()
  const [y, m] = defaultMonth.split('-').map(Number)
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))

  const [wallets, transactions, debts, goals, bounds, monthStats, pendingRows] = await Promise.all([
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
  ])

  const totalBalance = wallets.reduce((sum: number, w: { balance: number }) => sum + Number(w.balance), 0)
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
    },
  }
}

export default async function AdminDashboard() {
  const { wallets, transactions, goals, dashboard } = await getDashboardData()

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardStats
        totalBalance={dashboard.totalBalance}
        totalDebtGiven={dashboard.totalDebtGiven}
        totalDebtTaken={dashboard.totalDebtTaken}
        pendingRequests={dashboard.pendingRequests}
        monthOptions={dashboard.monthOptions}
        initialMonth={dashboard.initialMonth}
        initialIncome={dashboard.initialIncome}
        initialExpenses={dashboard.initialExpenses}
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <WalletCards wallets={wallets} />
        <GoalProgress goals={goals} />
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  )
}
