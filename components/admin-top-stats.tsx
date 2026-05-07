import { sql } from '@/lib/db'
import { sumWalletsForDashboardTotal } from '@/lib/wallet-dashboard-total'
import { DashboardStats } from '@/components/dashboard-stats'
import { buildMonthSelectOptionsFromBounds } from '@/lib/transaction-dates'

/**
 * Верхний KPI-виджет, который показывает админу одни и те же ключевые цифры
 * (общий баланс, доход/расход за месяц, долги, новые заявки) на всех важных
 * страницах: «Кошельки», «Доходы», «Расходы». На самом дашборде используется
 * полная версия с h1 (см. AdminDashboardShell).
 *
 * Это серверный компонент — данные считаются на каждый запрос параллельно,
 * без лишнего round-trip'а. Селектор месяца внутри клиентский, дополняет
 * один лёгкий fetch /api/stats/month при ручной смене месяца.
 */
function defaultCalendarMonthKey(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export async function AdminTopStats() {
  const defaultMonth = defaultCalendarMonthKey()
  const [y, m] = defaultMonth.split('-').map(Number)
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))

  const [walletsRows, debtsRows, boundsRows, monthStatsRows, pendingRows] = await Promise.all([
    sql`SELECT name, balance FROM wallets`,
    sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'given' THEN amount ELSE 0 END), 0)::float AS given,
        COALESCE(SUM(CASE WHEN type = 'taken' THEN amount ELSE 0 END), 0)::float AS taken
      FROM debts
      WHERE is_paid = false
    `,
    sql`
      SELECT 
        to_char(date_trunc('month', MIN(created_at)), 'YYYY-MM') AS min_ym,
        to_char(date_trunc('month', MAX(created_at)), 'YYYY-MM') AS max_ym
      FROM transactions
    `,
    sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS total_expenses
      FROM transactions
      WHERE created_at >= ${monthStart.toISOString()}
        AND created_at < ${monthEnd.toISOString()}
    `,
    sql`SELECT COUNT(*)::text AS count FROM partner_requests WHERE status = 'pending'`,
  ])

  const totalBalance = sumWalletsForDashboardTotal(
    walletsRows as { name: string; balance: number | string }[],
  )
  const totalDebtGiven = Number(debtsRows[0]?.given ?? 0)
  const totalDebtTaken = Number(debtsRows[0]?.taken ?? 0)

  const b = boundsRows[0]
  const monthOptions = buildMonthSelectOptionsFromBounds(b?.min_ym ?? null, b?.max_ym ?? null)

  const ms = monthStatsRows[0]
  const initialIncome = Number(ms?.total_income ?? 0)
  const initialExpenses = Number(ms?.total_expenses ?? 0)
  const pendingRequests = Number(pendingRows[0]?.count ?? 0)

  return (
    <DashboardStats
      compact
      totalBalance={totalBalance}
      totalDebtGiven={totalDebtGiven}
      totalDebtTaken={totalDebtTaken}
      pendingRequests={pendingRequests}
      monthOptions={monthOptions}
      initialMonth={defaultMonth}
      initialIncome={initialIncome}
      initialExpenses={initialExpenses}
    />
  )
}
