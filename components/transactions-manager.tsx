'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import {
  transactionMonthKey,
  transactionMonthTitleRu,
  formatTransactionDateRu,
  buildMonthSelectOptions,
} from '@/lib/transaction-dates'
import type { Transaction, Wallet, Category, Partner, Worker } from '@/lib/db'
import { cn } from '@/lib/utils'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function counterpartyLabel(t: Transaction): string {
  const parts = [t.worker_name, t.partner_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

type Props = {
  type: 'income' | 'expense'
  initialTransactions: Transaction[]
  wallets: Wallet[]
  categories: Category[]
  partners: Partner[]
  workers: Worker[]
}

export function TransactionsManager({
  type,
  initialTransactions,
  wallets,
  categories,
  partners,
  workers,
}: Props) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [isOpen, setIsOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [monthFilter, setMonthFilter] = useState<string>('all')

  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  const Icon = type === 'income' ? ArrowUpCircle : ArrowDownCircle
  const colorClass = type === 'income' ? 'text-success' : 'text-destructive'

  const monthOptions = useMemo(
    () => buildMonthSelectOptions(initialTransactions),
    [initialTransactions],
  )

  const filteredTransactions = useMemo(() => {
    if (monthFilter === 'all') return transactions
    return transactions.filter((t) => transactionMonthKey(t.created_at) === monthFilter)
  }, [transactions, monthFilter])

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filteredTransactions) {
      const key = transactionMonthKey(t.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredTransactions])

  const periodTotal = useMemo(
    () => filteredTransactions.reduce((s, t) => s + Number(t.amount), 0),
    [filteredTransactions],
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const noneValue = '__none__'
    const rawPartnerId = formData.get('partner_id') as string | null
    const rawWorkerId = formData.get('worker_id') as string | null
    const data = {
      wallet_id: Number(formData.get('wallet_id')),
      category_id: Number(formData.get('category_id')),
      type,
      amount: Number(formData.get('amount')),
      description: formData.get('description') as string || null,
      partner_id: rawPartnerId && rawPartnerId !== noneValue ? Number(rawPartnerId) : null,
      worker_id: rawWorkerId && rawWorkerId !== noneValue ? Number(rawWorkerId) : null,
    }

    try {
      const res = await fetch('/api/transactions', {
        method: editTransaction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTransaction ? { ...data, id: editTransaction.id } : data),
      })

      if (res.ok) {
        setIsOpen(false)
        setEditTransaction(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить операцию?')) return

    const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTransactions(transactions.filter((t) => t.id !== id))
      router.refresh()
    }
  }

  function renderTableRows(items: Transaction[]) {
    return items.map((t) => (
      <TableRow key={t.id}>
        <TableCell className="whitespace-nowrap">
          {formatTransactionDateRu(t.created_at)}
        </TableCell>
        <TableCell>{t.category_name}</TableCell>
        <TableCell className="max-w-[220px]">
          <span className="font-medium text-foreground">{counterpartyLabel(t)}</span>
        </TableCell>
        <TableCell>{t.wallet_name}</TableCell>
        <TableCell className="max-w-[200px] truncate">{t.description || '-'}</TableCell>
        <TableCell className={`text-right font-medium ${colorClass}`}>
          {type === 'income' ? '+' : '-'}
          {formatCurrency(Number(t.amount))}
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-8 sm:w-8"
              onClick={() => {
                setEditTransaction(t)
                setIsOpen(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive hover:text-destructive sm:h-8 sm:w-8"
              onClick={() => handleDelete(t.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))
  }

  function renderMobileCards(items: Transaction[]) {
    return (
      <div className="space-y-3 lg:hidden">
        {items.map((t) => (
          <div
            key={t.id}
            className="min-w-0 overflow-hidden rounded-xl border border-border bg-secondary/30 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">{formatTransactionDateRu(t.created_at)}</p>
                <p className="font-medium leading-snug">{t.category_name}</p>
                <p className="break-words text-sm text-muted-foreground">{counterpartyLabel(t)}</p>
                <p className="break-words text-sm text-muted-foreground">{t.wallet_name}</p>
                {t.description ? (
                  <p className="break-words text-sm text-foreground/90">{t.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className={cn('text-right text-base font-semibold tabular-nums', colorClass)}>
                  {type === 'income' ? '+' : '-'}
                  {formatCurrency(Number(t.amount))}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      setEditTransaction(t)
                      setIsOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Label htmlFor="month-filter" className="shrink-0 text-sm text-muted-foreground sm:whitespace-nowrap">
            Период
          </Label>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger
              id="month-filter"
              className="h-11 w-full text-base sm:h-10 sm:w-[min(100%,280px)] sm:text-sm"
            >
              <SelectValue placeholder="Месяц" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все месяцы (по группам)</SelectItem>
              {monthOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {transactionMonthTitleRu(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            className={cn(
              'min-w-0 break-words text-sm font-semibold tabular-nums sm:text-base',
              colorClass,
            )}
          >
            {monthFilter === 'all' ? 'Всего' : 'За месяц'}: {type === 'income' ? '+' : '-'}
            {formatCurrency(periodTotal)}
          </span>
        </div>
        <div className="flex w-full justify-stretch sm:w-auto sm:justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditTransaction(null)
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto">
              <Plus className="h-4 w-4 shrink-0" />
              Добавить {type === 'income' ? 'доход' : 'расход'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-sm:p-4 sm:max-w-lg">
            <DialogHeader className="min-w-0 pr-8 text-left">
              <DialogTitle className="break-words text-base leading-snug sm:text-lg">
                {editTransaction ? 'Редактировать' : 'Новая операция'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="wallet_id">Кошелек</Label>
                <Select name="wallet_id" defaultValue={editTransaction?.wallet_id?.toString()} required>
                  <SelectTrigger className="h-11 w-full min-w-0 max-w-full sm:h-10">
                    <SelectValue placeholder="Выберите кошелек" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor="category_id">Категория</Label>
                <Select name="category_id" defaultValue={editTransaction?.category_id?.toString()} required>
                  <SelectTrigger className="h-11 w-full min-w-0 max-w-full sm:h-10">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor="amount">Сумма</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  defaultValue={editTransaction?.amount}
                  required
                  className="h-11 w-full min-w-0 sm:h-10"
                />
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Комментарий к операции"
                  defaultValue={editTransaction?.description || ''}
                  className="min-h-[88px] w-full min-w-0 max-w-full text-base sm:min-h-[80px] sm:text-sm"
                />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="partner_id">Партнёр</Label>
                  <Select
                    name="partner_id"
                    defaultValue={editTransaction?.partner_id?.toString() || '__none__'}
                  >
                    <SelectTrigger className="h-11 w-full min-w-0 max-w-full sm:h-10">
                      <SelectValue placeholder="Не выбран" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Не выбран</SelectItem>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0 space-y-2">
                  <Label htmlFor="worker_id">Работник</Label>
                  <Select
                    name="worker_id"
                    defaultValue={editTransaction?.worker_id?.toString() || '__none__'}
                  >
                    <SelectTrigger className="h-11 w-full min-w-0 max-w-full sm:h-10">
                      <SelectValue placeholder="Не выбран" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Не выбран</SelectItem>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full min-w-0 sm:h-10" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorClass}`} />
            {type === 'income' ? 'Доходы' : 'Расходы'}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-hidden">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет операций</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет операций за выбранный месяц
            </p>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {groupedByMonth.map(([key, rows]) => {
                const blockTotal = rows.reduce((s, t) => s + Number(t.amount), 0)
                return (
                  <div key={key} className="min-w-0">
                    <div className="mb-3 flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
                      <h3 className="text-base font-semibold text-foreground">
                        {transactionMonthTitleRu(key)}
                      </h3>
                      <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
                        Итого: {type === 'income' ? '+' : '-'}
                        {formatCurrency(blockTotal)}
                      </span>
                    </div>
                    {renderMobileCards(rows)}
                    <div className="hidden overflow-x-auto rounded-md border border-border lg:block">
                      <Table className="min-w-[720px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Дата</TableHead>
                            <TableHead>Категория</TableHead>
                            <TableHead>Получатель</TableHead>
                            <TableHead>Кошелек</TableHead>
                            <TableHead>Описание</TableHead>
                            <TableHead className="text-right">Сумма</TableHead>
                            <TableHead className="w-24"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>{renderTableRows(rows)}</TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
