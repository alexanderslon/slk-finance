'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
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

/** Прогресс цели в процентах (0..100). Защищаемся от деления на ноль и NaN. */
function goalProgress(goal: Goal): number {
  const target = Number(goal.target_amount)
  const current = Number(goal.current_amount)
  if (!Number.isFinite(target) || target <= 0) return Number(goal.current_amount) > 0 ? 100 : 0
  if (!Number.isFinite(current) || current <= 0) return 0
  return Math.min(100, (current / target) * 100)
}

export function GoalsManager({ initialGoals }: { initialGoals: Goal[] }) {
  const router = useRouter()
  const [goals, setGoals] = useState(initialGoals)
  const [isOpen, setIsOpen] = useState(false)
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  // После router.refresh() сервер отдаёт свежие initialGoals — синхронизируем
  // локальный state. Без этого после удаления оставались устаревшие данные.
  useEffect(() => {
    setGoals(initialGoals)
  }, [initialGoals])

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

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось сохранить цель')
        return
      }
      toast.success(editGoal ? 'Цель обновлена' : 'Цель добавлена')
      setIsOpen(false)
      setEditGoal(null)
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
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
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Укажите положительную сумму')
      setLoading(false)
      return
    }
    const newAmount = Number(selectedGoal.current_amount) + amount

    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedGoal.id, current_amount: newAmount }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось пополнить')
        return
      }
      toast.success(`Пополнено: ${formatCurrency(amount)}`)
      setAddMoneyOpen(false)
      setSelectedGoal(null)
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number, name?: string) {
    const ok = await confirm({
      title: 'Удалить цель?',
      description: name
        ? `«${name}» будет удалена безвозвратно.`
        : 'Действие нельзя отменить.',
      confirmLabel: 'Удалить',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Не удалось удалить цель')
        return
      }
      toast.success('Цель удалена')
      setGoals((prev) => prev.filter((g) => g.id !== id))
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
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

      {/* Mobile-first: как «Долги» — полноширинные карточки-строки */}
      <div className="space-y-3 sm:hidden">
        {goals.map((goal) => {
          const progress = goalProgress(goal)
          const isComplete = progress >= 100
          return (
            <div
              key={goal.id}
              className="rounded-2xl border border-border bg-secondary/30 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isComplete ? 'bg-success/10' : 'bg-primary/10'}`}
                    aria-hidden
                  >
                    <Target className={`h-5 w-5 ${isComplete ? 'text-success' : 'text-primary'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium leading-snug">{goal.name}</p>
                    {goal.deadline ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        До {format(new Date(goal.deadline), 'd MMM yyyy', { locale: ru })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setEditGoal(goal)
                      setIsOpen(true)
                    }}
                    aria-label="Редактировать"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(goal.id, goal.name)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(Number(goal.current_amount))}
                </p>
                <p className={`text-sm font-semibold tabular-nums ${isComplete ? 'text-success' : 'text-muted-foreground'}`}>
                  {Math.round(progress)}%
                </p>
              </div>

              <div className="mt-2 space-y-1.5">
                <Progress value={Math.min(progress, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(Number(goal.current_amount))}</span>
                  <span>{formatCurrency(Number(goal.target_amount))}</span>
                </div>
              </div>

              <div className="mt-3">
                {!isComplete ? (
                  <Button
                    variant="outline"
                    className="h-11 w-full gap-2"
                    onClick={() => {
                      setSelectedGoal(goal)
                      setAddMoneyOpen(true)
                    }}
                  >
                    <PiggyBank className="h-4 w-4" />
                    Пополнить
                  </Button>
                ) : (
                  <div className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-medium text-success">
                    Цель достигнута!
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* sm+: десктоп — шире карточки, читаемые заголовки */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-2 2xl:grid-cols-3">
        {goals.map((goal) => {
          const progress = goalProgress(goal)
          const isComplete = progress >= 100
          return (
            <Card key={goal.id} className="rounded-3xl border-border bg-card">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isComplete ? 'bg-success/10' : 'bg-primary/10'}`}
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
                    onClick={() => handleDelete(goal.id, goal.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6 pt-0">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">
                    {goal.name}
                  </CardTitle>
                  {goal.deadline ? (
                    <p className="text-sm text-muted-foreground">
                      До {format(new Date(goal.deadline), 'd MMMM yyyy', { locale: ru })}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-end justify-between gap-3">
                  <p className="text-3xl font-bold tabular-nums">
                    {formatCurrency(Number(goal.current_amount))}
                  </p>
                  <p className={`text-sm font-semibold tabular-nums ${isComplete ? 'text-success' : 'text-muted-foreground'}`}>
                    {Math.round(progress)}%
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(Number(goal.current_amount))}</span>
                    <span>Цель: {formatCurrency(Number(goal.target_amount))}</span>
                  </div>
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
      {dialog}
    </>
  )
}
