'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Target, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Goal } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Шаблон как у «Кошельки»: rounded-2xl border bg-secondary/30,
 * на мобиле — колонка, на sm+ — строка с суммой/процентом справа.
 */
export function GoalProgress({ goals }: { goals: Goal[] }) {
  return (
    <Card className="rounded-3xl border-border bg-card">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          <Target className="h-5 w-5 shrink-0" />
          Цели
        </CardTitle>
        <Link
          href="/admin/goals"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 hover:underline sm:ml-auto sm:min-h-0 sm:w-auto sm:justify-end sm:px-2 sm:py-1.5"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Добавить
        </Link>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {goals.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Нет целей</p>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const progress =
                (Number(goal.current_amount) / Number(goal.target_amount)) * 100
              const pct = Math.round(progress)
              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-border bg-secondary/30 p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium leading-snug">{goal.name}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatCurrency(Number(goal.current_amount))} из{' '}
                          {formatCurrency(Number(goal.target_amount))}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-right text-base font-semibold tabular-nums text-primary sm:text-lg">
                      {pct}%
                    </p>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Собрано</span>
                      <span>Цель</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
