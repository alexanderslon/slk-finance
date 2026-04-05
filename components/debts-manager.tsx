'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Pencil, Trash2, Check, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Debt } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DebtsManager({ initialDebts }: { initialDebts: Debt[] }) {
  const router = useRouter()
  const [debts, setDebts] = useState(initialDebts)
  const [isOpen, setIsOpen] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | null>(null)
  const [loading, setLoading] = useState(false)

  const givenDebts = debts.filter((d) => d.type === 'given' && !d.is_paid)
  const takenDebts = debts.filter((d) => d.type === 'taken' && !d.is_paid)
  const paidDebts = debts.filter((d) => d.is_paid)

  const totalGiven = givenDebts.reduce((sum, d) => sum + Number(d.amount), 0)
  const totalTaken = takenDebts.reduce((sum, d) => sum + Number(d.amount), 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      debtor_name: formData.get('debtor_name') as string,
      type: formData.get('type') as 'given' | 'taken',
      amount: Number(formData.get('amount')),
      description: formData.get('description') as string || null,
      due_date: formData.get('due_date') as string || null,
    }

    try {
      const res = await fetch('/api/debts', {
        method: editDebt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDebt ? { ...data, id: editDebt.id } : data),
      })

      if (res.ok) {
        setIsOpen(false)
        setEditDebt(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid(id: number) {
    const res = await fetch('/api/debts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_paid: true }),
    })

    if (res.ok) {
      setDebts(debts.map((d) => (d.id === id ? { ...d, is_paid: true } : d)))
      router.refresh()
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить долг?')) return

    const res = await fetch(`/api/debts?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDebts(debts.filter((d) => d.id !== id))
      router.refresh()
    }
  }

  function DebtCard({ debt }: { debt: Debt }) {
    const isGiven = debt.type === 'given'
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isGiven ? 'bg-success/10' : 'bg-destructive/10'}`}>
            <CreditCard className={`h-5 w-5 ${isGiven ? 'text-success' : 'text-destructive'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{debt.debtor_name}</p>
              {debt.is_paid && <Badge variant="outline" className="text-success border-success">Оплачен</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {isGiven ? 'Дали в долг' : 'Взяли в долг'}
              {debt.due_date && ` | До ${format(new Date(debt.due_date), 'd MMM yyyy', { locale: ru })}`}
            </p>
            {debt.description && <p className="text-sm text-muted-foreground mt-1">{debt.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-lg font-semibold ${isGiven ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(Number(debt.amount))}
          </p>
          {!debt.is_paid && (
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-success hover:text-success"
                onClick={() => handleMarkPaid(debt.id)}
                title="Отметить как оплаченный"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditDebt(debt)
                  setIsOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(debt.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
          <Card className="border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs text-muted-foreground sm:text-sm">Дали в долг</p>
            <p className="text-lg font-bold tabular-nums text-success sm:text-xl">{formatCurrency(totalGiven)}</p>
          </Card>
          <Card className="border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs text-muted-foreground sm:text-sm">Взяли в долг</p>
            <p className="text-lg font-bold tabular-nums text-destructive sm:text-xl">{formatCurrency(totalTaken)}</p>
          </Card>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditDebt(null)
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto sm:shrink-0">
              <Plus className="h-4 w-4 shrink-0" />
              Добавить долг
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editDebt ? 'Редактировать долг' : 'Новый долг'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="debtor_name">Имя</Label>
                <Input
                  id="debtor_name"
                  name="debtor_name"
                  placeholder="Кому дали / у кого взяли"
                  defaultValue={editDebt?.debtor_name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Тип</Label>
                <Select name="type" defaultValue={editDebt?.type || 'given'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="given">Дали в долг</SelectItem>
                    <SelectItem value="taken">Взяли в долг</SelectItem>
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
                  defaultValue={editDebt?.amount}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Срок возврата</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  defaultValue={editDebt?.due_date ? format(new Date(editDebt.due_date), 'yyyy-MM-dd') : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Комментарий"
                  defaultValue={editDebt?.description || ''}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-success">Дали в долг ({givenDebts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {givenDebts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Нет активных долгов</p>
            ) : (
              givenDebts.map((debt) => <DebtCard key={debt.id} debt={debt} />)
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-destructive">Взяли в долг ({takenDebts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {takenDebts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Нет активных долгов</p>
            ) : (
              takenDebts.map((debt) => <DebtCard key={debt.id} debt={debt} />)
            )}
          </CardContent>
        </Card>
      </div>

      {paidDebts.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Оплаченные долги ({paidDebts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paidDebts.map((debt) => <DebtCard key={debt.id} debt={debt} />)}
          </CardContent>
        </Card>
      )}
    </>
  )
}
