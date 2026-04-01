'use client'

import { useState } from 'react'
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
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Transaction, Wallet, Category, Partner, Worker } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
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

  const Icon = type === 'income' ? ArrowUpCircle : ArrowDownCircle
  const colorClass = type === 'income' ? 'text-success' : 'text-destructive'

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

  return (
    <>
      <div className="flex justify-end">
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Кошелек</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(t.created_at), 'd MMM yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>{t.category_name}</TableCell>
                      <TableCell>{t.wallet_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {t.description || '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${colorClass}`}>
                        {type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
