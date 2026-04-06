'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, ChevronDown, FileText } from 'lucide-react'
import { transactionMonthTitleRu } from '@/lib/transaction-dates'
import { cn } from '@/lib/utils'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function transactionMonthShortRu(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  if (!y || !m) return yyyyMm
  return format(new Date(y, m - 1, 1), 'LLL yyyy', { locale: ru })
}

const dashLinkClass =
  'block rounded-xl outline-none ring-offset-background transition-colors hover:bg-muted/25 active:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring'

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
  const [monthSheetOpen, setMonthSheetOpen] = useState(false)

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

  async function pickMonthFromSheet(value: string) {
    setMonthSheetOpen(false)
    await onMonthChange(value)
  }

  return (
    <div className="space-y-2 max-lg:space-y-2 sm:space-y-4 lg:space-y-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight max-lg:tracking-tight sm:text-xl lg:text-2xl">
            Дашборд
          </h1>
          <p className="mt-0.5 hidden text-sm text-muted-foreground lg:block">
            Общая статистика финансов
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-2">
            <Sheet open={monthSheetOpen} onOpenChange={setMonthSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 gap-1 px-2.5 text-sm font-medium lg:hidden"
                  disabled={loading || monthOptions.length === 0}
                  aria-label="Выбрать месяц для доходов и расходов"
                >
                  Месяц
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="z-50 max-h-[min(85dvh,32rem)] rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
              >
                <SheetHeader className="border-b border-border pb-3 text-left">
                  <SheetTitle>Месяц</SheetTitle>
                  <p className="text-sm font-normal text-muted-foreground">
                    Доходы и расходы за выбранный месяц
                  </p>
                </SheetHeader>
                <div
                  className="-mx-4 max-h-[55vh] overflow-y-auto px-4 pt-2 [-webkit-overflow-scrolling:touch]"
                  role="listbox"
                  aria-label="Список месяцев"
                >
                  {monthOptions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Нет данных по месяцам</p>
                  ) : (
                    <div className="flex flex-col gap-1 pb-2">
                      {monthOptions.map((key) => {
                        const selected = key === month
                        return (
                          <button
                            key={key}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            disabled={loading}
                            onClick={() => void pickMonthFromSheet(key)}
                            className={cn(
                              'min-h-11 w-full rounded-xl px-3 py-2.5 text-left text-base transition-colors',
                              selected
                                ? 'bg-primary/15 font-medium text-primary'
                                : 'active:bg-muted',
                            )}
                          >
                            {transactionMonthTitleRu(key)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden items-center gap-2 lg:flex">
              <Label
                htmlFor="dashboard-month"
                className="shrink-0 whitespace-nowrap text-sm text-muted-foreground"
              >
                Месяц
              </Label>
              <Select value={month} onValueChange={onMonthChange} disabled={loading}>
                <SelectTrigger
                  id="dashboard-month"
                  className="h-10 w-[min(100%,280px)] text-sm"
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
            </div>
          </div>
          {loading ? <span className="text-xs text-muted-foreground">Обновление…</span> : null}
        </div>
      </div>

      {/* Mobile: компактные карточки как в партнёрке */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:hidden">
        <Link href="/admin/wallets" className={dashLinkClass} aria-label="Перейти к кошелькам">
          <Card className="h-full border-border bg-card">
            <CardContent className="flex items-center gap-2.5 p-3 pt-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold tabular-nums leading-tight">
                  {formatCurrency(totalBalance)}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">Баланс</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/income" className={dashLinkClass} aria-label="Перейти к доходам">
          <Card className="h-full border-border bg-card">
            <CardContent className="flex items-center gap-2.5 p-3 pt-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/10">
                <ArrowUpCircle className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-base font-bold tabular-nums leading-tight text-success',
                    loading && 'opacity-50',
                  )}
                >
                  {formatCurrency(income)}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Доход · {transactionMonthShortRu(month)}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/expenses" className={dashLinkClass} aria-label="Перейти к расходам">
          <Card className="h-full border-border bg-card">
            <CardContent className="flex items-center gap-2.5 p-3 pt-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <ArrowDownCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-base font-bold tabular-nums leading-tight text-destructive',
                    loading && 'opacity-50',
                  )}
                >
                  {formatCurrency(expenses)}
                </p>
                <p className="text-[11px] leading-tight text-muted-foreground">
                  Расход · {transactionMonthShortRu(month)}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/requests" className={dashLinkClass} aria-label="Перейти к заявкам">
          <Card className="h-full border-border bg-card">
            <CardContent className="flex items-center gap-2.5 p-3 pt-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <FileText className="h-4 w-4 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold tabular-nums leading-tight">{pendingRequests}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">Новые заявки</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Link
        href="/admin/debts"
        className={cn(dashLinkClass, 'md:hidden')}
        aria-label="Перейти к долгам"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
          <span>
            Дал: <span className="font-semibold text-success">{formatCurrency(totalDebtGiven)}</span>
          </span>
          <span>
            Взял: <span className="font-semibold text-destructive">{formatCurrency(totalDebtTaken)}</span>
          </span>
        </div>
      </Link>

      {/* Desktop / tablet: прежняя сетка из пяти карточек */}
      <div className="hidden grid-cols-2 gap-3 sm:gap-4 md:grid lg:grid-cols-3 xl:grid-cols-5">
        <Link href="/admin/wallets" className={dashLinkClass} aria-label="Перейти к кошелькам">
          <Card className="h-full border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">Общий баланс</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(totalBalance)}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/income" className={dashLinkClass} aria-label="Перейти к доходам">
          <Card className="h-full border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">
                Доходы за {transactionMonthTitleRu(month)}
              </CardTitle>
              <ArrowUpCircle className="h-4 w-4 shrink-0 text-success" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div
                className={`text-xl font-bold tabular-nums text-success sm:text-2xl ${loading ? 'opacity-50' : ''}`}
              >
                {formatCurrency(income)}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/expenses" className={dashLinkClass} aria-label="Перейти к расходам">
          <Card className="h-full border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">
                Расходы за {transactionMonthTitleRu(month)}
              </CardTitle>
              <ArrowDownCircle className="h-4 w-4 shrink-0 text-destructive" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div
                className={`text-xl font-bold tabular-nums text-destructive sm:text-2xl ${loading ? 'opacity-50' : ''}`}
              >
                {formatCurrency(expenses)}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/debts" className={dashLinkClass} aria-label="Перейти к долгам">
          <Card className="h-full border-border bg-card">
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
        </Link>

        <Link href="/admin/requests" className={dashLinkClass} aria-label="Перейти к заявкам">
          <Card className="h-full border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">Новые заявки</CardTitle>
              <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              <div className="text-xl font-bold tabular-nums sm:text-2xl">{pendingRequests}</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
