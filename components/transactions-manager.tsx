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
              className="h-8 w-8"
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
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleDelete(t.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="month-filter" className="text-muted-foreground whitespace-nowrap">
            Период
          </Label>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger id="month-filter" className="w-[min(100%,280px)]">
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
          <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
            {monthFilter === 'all' ? 'Всего' : 'За месяц'}: {type === 'income' ? '+' : '-'}
            {formatCurrency(periodTotal)}
          </span>
        </div>
        <div className="flex justify-end sm:justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditTransaction(null)
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить {type === 'income' ? 'доход' : 'расход'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editTransaction ? 'Редактировать' : 'Новая операция'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet_id">Кошелек</Label>
                <Select name="wallet_id" defaultValue={editTransaction?.wallet_id?.toString()} required>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="category_id">Категория</Label>
                <Select name="category_id" defaultValue={editTransaction?.category_id?.toString()} required>
                  <SelectTrigger>
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

              <div className="space-y-2">
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Комментарий к операции"
                  defaultValue={editTransaction?.description || ''}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partner_id">Партнер</Label>
                  <Select
                    name="partner_id"
                    defaultValue={editTransaction?.partner_id?.toString() || '__none__'}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="worker_id">Работник</Label>
                  <Select
                    name="worker_id"
                    defaultValue={editTransaction?.worker_id?.toString() || '__none__'}
                  >
                    <SelectTrigger>
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

              <Button type="submit" className="w-full" disabled={loading}>
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
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет операций</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет операций за выбранный месяц
            </p>
          ) : (
            <div className="space-y-8 overflow-x-auto">
              {groupedByMonth.map(([key, rows]) => {
                const blockTotal = rows.reduce((s, t) => s + Number(t.amount), 0)
                return (
                  <div key={key}>
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                      <h3 className="text-base font-semibold capitalize text-foreground">
                        {transactionMonthTitleRu(key)}
                      </h3>
                      <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
                        Итого: {type === 'income' ? '+' : '-'}
                        {formatCurrency(blockTotal)}
                      </span>
                    </div>
                    <Table>
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
