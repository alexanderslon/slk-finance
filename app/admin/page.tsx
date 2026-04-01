import { sql } from '@/lib/db'
import { DashboardStats } from '@/components/dashboard-stats'
import { WalletCards } from '@/components/wallet-cards'
import { RecentTransactions } from '@/components/recent-transactions'
import { GoalProgress } from '@/components/goal-progress'

async function getDashboardData() {
  const [wallets, transactions, debts, goals, stats] = await Promise.all([
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
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `,
  ])

  const totalBalance = wallets.reduce((sum: number, w: { balance: number }) => sum + Number(w.balance), 0)
  const totalDebtGiven = debts
    .filter((d: { type: string }) => d.type === 'given')
    .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount), 0)
  const totalDebtTaken = debts
    .filter((d: { type: string }) => d.type === 'taken')
    .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount), 0)

  return {
    wallets,
    transactions,
    goals,
    stats: {
      totalBalance,
      totalIncome: Number(stats[0]?.total_income || 0),
      totalExpenses: Number(stats[0]?.total_expenses || 0),
      totalDebtGiven,
      totalDebtTaken,
    },
  }
}

export default async function AdminDashboard() {
  const { wallets, transactions, goals, stats } = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground">Общая статистика финансов</p>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <WalletCards wallets={wallets} />
        <GoalProgress goals={goals} />
      </div>

      <RecentTransactions transactions={transactions} />
    </div>
  )
}
