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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
        <Label htmlFor="dashboard-month" className="text-muted-foreground shrink-0">
          Месяц (доходы и расходы)
        </Label>
        <Select value={month} onValueChange={onMonthChange} disabled={loading}>
          <SelectTrigger id="dashboard-month" className="w-[min(100%,280px)]">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Общий баланс</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Доходы за {transactionMonthTitleRu(month)}
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-success ${loading ? 'opacity-50' : ''}`}>
              {formatCurrency(income)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Расходы за {transactionMonthTitleRu(month)}
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold text-destructive ${loading ? 'opacity-50' : ''}`}>
              {formatCurrency(expenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Долги</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Дал: </span>
                <span className="font-medium text-success">{formatCurrency(totalDebtGiven)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Взял: </span>
                <span className="font-medium text-destructive">{formatCurrency(totalDebtTaken)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Новые заявки</CardTitle>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
