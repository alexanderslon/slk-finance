'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpCircle, ArrowDownCircle, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Transaction } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card className="rounded-3xl border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Последние операции
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Нет операций</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      transaction.type === 'income'
                        ? 'bg-success/10'
                        : 'bg-destructive/10'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{transaction.category_name}</p>
                    <p className="break-words text-sm text-muted-foreground">
                      {[
                        transaction.worker_name,
                        transaction.partner_name,
                        transaction.wallet_name,
                        transaction.description,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end text-right sm:pl-2">
                  <p
                    className={`text-base font-semibold tabular-nums sm:text-lg ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(Number(transaction.amount))}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), 'd MMM, HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
