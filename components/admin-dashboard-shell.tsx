'use client'

import { useState } from 'react'
import { DashboardStats } from '@/components/dashboard-stats'
import { DashboardAnalytics, type DashboardAnalyticsData } from '@/components/dashboard-analytics'

/**
 * Клиентская обёртка дашборда: держит выбранный месяц и пробрасывает его
 * в аналитический блок (графики), пока DashboardStats показывает KPI.
 *
 * Сервер отдаёт начальные значения за месяц по умолчанию; смена месяца
 * пользователем триггерит fetch /api/stats/analytics в детях, без перезагрузки
 * страницы и без круга по серверу для основных карточек.
 */
type Props = {
  totalBalance: number
  totalDebtGiven: number
  totalDebtTaken: number
  pendingRequests: number
  monthOptions: string[]
  initialMonth: string
  initialIncome: number
  initialExpenses: number
  initialAnalytics: DashboardAnalyticsData
}

export function AdminDashboardShell({
  totalBalance,
  totalDebtGiven,
  totalDebtTaken,
  pendingRequests,
  monthOptions,
  initialMonth,
  initialIncome,
  initialExpenses,
  initialAnalytics,
}: Props) {
  const [month, setMonth] = useState(initialMonth)

  return (
    <>
      <DashboardStats
        totalBalance={totalBalance}
        totalDebtGiven={totalDebtGiven}
        totalDebtTaken={totalDebtTaken}
        pendingRequests={pendingRequests}
        monthOptions={monthOptions}
        initialMonth={initialMonth}
        initialIncome={initialIncome}
        initialExpenses={initialExpenses}
        onMonthChange={setMonth}
      />
      <DashboardAnalytics initialData={initialAnalytics} month={month} />
    </>
  )
}
