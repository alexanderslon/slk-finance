'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet as WalletIcon, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Wallet } from '@/lib/db'

function formatCurrency(amount: number, currency: string = 'RUB') {
  const currencyMap: Record<string, string> = {
    RUB: 'RUB',
    USD: 'USD',
    EUR: 'EUR',
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyMap[currency] || 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function WalletCards({ wallets }: { wallets: Wallet[] }) {
  return (
    <Card className="rounded-3xl border-border bg-card">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          <WalletIcon className="h-5 w-5 shrink-0" />
          Кошельки
        </CardTitle>
        <Link
          href="/admin/wallets"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 hover:underline sm:ml-auto sm:min-h-0 sm:w-auto sm:justify-end sm:px-2 sm:py-1.5"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Добавить
        </Link>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {wallets.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Нет кошельков</p>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <WalletIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{wallet.name}</p>
                    <p className="text-sm text-muted-foreground">{wallet.currency}</p>
                  </div>
                </div>
                <p className="shrink-0 text-right text-base font-semibold tabular-nums sm:text-lg">
                  {formatCurrency(Number(wallet.balance), wallet.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
