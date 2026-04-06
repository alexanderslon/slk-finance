'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet as WalletIcon, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Wallet } from '@/lib/db'

/** Всегда внизу блока «Кошельки» на дашборде, в этом порядке (остальные — выше, порядок как в БД). */
const DASHBOARD_PINNED_WALLET_NAMES = [
  'На будущее',
  'На развитие',
  'Благотворительность',
] as const

function sortWalletsForDashboard(wallets: Wallet[]): Wallet[] {
  const orderIndex = new Map<string, number>(
    DASHBOARD_PINNED_WALLET_NAMES.map((name, i) => [name.trim().toLowerCase(), i]),
  )
  const rest: Wallet[] = []
  const pinned: { wallet: Wallet; idx: number }[] = []
  for (const w of wallets) {
    const key = w.name.trim().toLowerCase()
    const idx = orderIndex.get(key)
    if (idx !== undefined) pinned.push({ wallet: w, idx })
    else rest.push(w)
  }
  pinned.sort((a, b) => a.idx - b.idx)
  return [...rest, ...pinned.map((p) => p.wallet)]
}

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

function WalletRow({ wallet }: { wallet: Wallet }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <WalletIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-snug sm:text-lg">{wallet.name}</p>
          {wallet.currency && wallet.currency !== 'RUB' ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{wallet.currency}</p>
          ) : null}
        </div>
      </div>
      <p className="shrink-0 text-right text-base font-semibold tabular-nums sm:text-lg">
        {formatCurrency(Number(wallet.balance), wallet.currency)}
      </p>
    </div>
  )
}

export function WalletCards({ wallets }: { wallets: Wallet[] }) {
  const orderedWallets = sortWalletsForDashboard(wallets)

  const body =
    orderedWallets.length === 0 ? (
      <p className="py-8 text-center text-muted-foreground">Нет кошельков</p>
    ) : (
      <div className="space-y-3">
        {orderedWallets.map((wallet) => (
          <WalletRow key={wallet.id} wallet={wallet} />
        ))}
      </div>
    )

  return (
    <>
      {/* Мобилка: как «Долги» / «Цели» — без внешней Card, на всю ширину области контента */}
      <section className="space-y-3 sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            <WalletIcon className="h-5 w-5 shrink-0" aria-hidden />
            Кошельки
          </h2>
          <Link
            href="/admin/wallets"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 hover:underline"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Добавить
          </Link>
        </div>
        {body}
      </section>

      <Card className="hidden rounded-3xl border-border bg-card sm:block">
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
        <CardContent className="px-6 pb-6">{body}</CardContent>
      </Card>
    </>
  )
}
