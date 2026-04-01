'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <WalletIcon className="h-5 w-5" />
          Кошельки
        </CardTitle>
        <Link href="/admin/wallets">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {wallets.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Нет кошельков</p>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <WalletIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{wallet.name}</p>
                    <p className="text-sm text-muted-foreground">{wallet.currency}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold">
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
