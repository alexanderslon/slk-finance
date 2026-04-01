'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

export function GoalProgress({ goals }: { goals: Goal[] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Цели
        </CardTitle>
        <Link href="/admin/goals">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Нет целей</p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(progress)}%
                    </p>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(Number(goal.current_amount))}</span>
                    <span>{formatCurrency(Number(goal.target_amount))}</span>
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
