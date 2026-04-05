'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard } from 'lucide-react'
import { transactionMonthTitleRu } from '@/lib/transaction-dates'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

type Props = {
  totalBalance: number
  totalDebtGiven: number
  totalDebtTaken: number
  pendingRequests: number
  monthOptions: string[]
  initialMonth: string
  initialIncome: number
  initialExpenses: number
}

export function DashboardStats({
  totalBalance,
  totalDebtGiven,
  totalDebtTaken,
  pendingRequests,
  monthOptions,
  initialMonth,
  initialIncome,
  initialExpenses,
}: Props) {
  const [month, setMonth] = useState(initialMonth)
  const [income, setIncome] = useState(initialIncome)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMonth(initialMonth)
    setIncome(initialIncome)
    setExpenses(initialExpenses)
  }, [initialMonth, initialIncome, initialExpenses])

  async function onMonthChange(value: string) {
    setMonth(value)
    setLoading(true)
    try {
      const res = await fetch(`/api/stats/month?month=${encodeURIComponent(value)}`)
      if (!res.ok) return
      const data = await res.json()
      setIncome(Number(data.totalIncome ?? 0))
      setExpenses(Number(data.totalExpenses ?? 0))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
        <Label htmlFor="dashboard-month" className="shrink-0 text-sm text-muted-foreground sm:text-base">
          Месяц (доходы и расходы)
        </Label>
        <Select value={month} onValueChange={onMonthChange} disabled={loading}>
          <SelectTrigger
            id="dashboard-month"
            className="h-11 w-full min-w-0 text-base sm:h-10 sm:w-[min(100%,280px)] sm:text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((key) => (
              <SelectItem key={key} value={key}>
                {transactionMonthTitleRu(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading ? <span className="text-xs text-muted-foreground">Обновление…</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">Общий баланс</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div className="text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
            <CardTitle className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">
              Доходы за {transactionMonthTitleRu(month)}
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div
              className={`text-xl font-bold tabular-nums text-success sm:text-2xl ${loading ? 'opacity-50' : ''}`}
            >
              {formatCurrency(income)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
            <CardTitle className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">
              Расходы за {transactionMonthTitleRu(month)}
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div
              className={`text-xl font-bold tabular-nums text-destructive sm:text-2xl ${loading ? 'opacity-50' : ''}`}
            >
              {formatCurrency(expenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">Долги</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div className="flex flex-col gap-1">
              <div className="text-xs sm:text-sm">
                <span className="text-muted-foreground">Дал: </span>
                <span className="font-medium text-success">{formatCurrency(totalDebtGiven)}</span>
              </div>
              <div className="text-xs sm:text-sm">
                <span className="text-muted-foreground">Взял: </span>
                <span className="font-medium text-destructive">{formatCurrency(totalDebtTaken)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">Новые заявки</CardTitle>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
          </CardHeader>
          <CardContent className="pb-4 sm:pb-6">
            <div className="text-xl font-bold tabular-nums sm:text-2xl">{pendingRequests}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
