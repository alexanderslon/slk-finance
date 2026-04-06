'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Target, PiggyBank } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Goal } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function GoalsManager({ initialGoals }: { initialGoals: Goal[] }) {
  const router = useRouter()
  const [goals, setGoals] = useState(initialGoals)
  const [isOpen, setIsOpen] = useState(false)
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      target_amount: Number(formData.get('target_amount')),
      current_amount: Number(formData.get('current_amount') || 0),
      deadline: formData.get('deadline') as string || null,
    }

    try {
      const res = await fetch('/api/goals', {
        method: editGoal ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editGoal ? { ...data, id: editGoal.id } : data),
      })

      if (res.ok) {
        setIsOpen(false)
        setEditGoal(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMoney(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedGoal) return
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const amount = Number(formData.get('amount'))
    const newAmount = Number(selectedGoal.current_amount) + amount

    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedGoal.id, current_amount: newAmount }),
      })

      if (res.ok) {
        setAddMoneyOpen(false)
        setSelectedGoal(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить цель?')) return

    const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGoals(goals.filter((g) => g.id !== id))
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex justify-stretch sm:justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditGoal(null)
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto">
              <Plus className="h-4 w-4 shrink-0" />
              Добавить цель
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editGoal ? 'Редактировать цель' : 'Новая цель'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="На что копим"
                  defaultValue={editGoal?.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_amount">Целевая сумма</Label>
                <Input
                  id="target_amount"
                  name="target_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  defaultValue={editGoal?.target_amount}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_amount">Накоплено</Label>
                <Input
                  id="current_amount"
                  name="current_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  defaultValue={editGoal?.current_amount || 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Дедлайн</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="date"
                  defaultValue={editGoal?.deadline ? format(new Date(editGoal.deadline), 'yyyy-MM-dd') : ''}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add money dialog */}
      <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пополнить цель: {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMoney} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Сумма пополнения</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Пополнение...' : 'Пополнить'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100
          const isComplete = progress >= 100
          return (
            <Card key={goal.id} className="border-border bg-card">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isComplete ? 'bg-success/10' : 'bg-primary/10'}`}
                  aria-hidden
                >
                  <Target className={`h-5 w-5 ${isComplete ? 'text-success' : 'text-primary'}`} />
                </div>
                <div className="flex shrink-0 justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditGoal(goal)
                      setIsOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-2 text-base leading-snug sm:text-[15px]">
                    {goal.name}
                  </CardTitle>
                  {goal.deadline ? (
                    <p className="text-xs text-muted-foreground">
                      До {format(new Date(goal.deadline), 'd MMM yyyy', { locale: ru })}
                    </p>
                  ) : null}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">
                      {formatCurrency(Number(goal.current_amount))}
                    </span>
                    <span className={`text-sm font-medium ${isComplete ? 'text-success' : 'text-muted-foreground'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Цель: {formatCurrency(Number(goal.target_amount))}
                  </p>
                </div>

                {!isComplete && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedGoal(goal)
                      setAddMoneyOpen(true)
                    }}
                  >
                    <PiggyBank className="h-4 w-4" />
                    Пополнить
                  </Button>
                )}

                {isComplete && (
                  <div className="text-center text-success font-medium py-2">
                    Цель достигнута!
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {goals.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Нет целей</p>
            <p className="text-muted-foreground">Добавьте первую финансовую цель</p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
