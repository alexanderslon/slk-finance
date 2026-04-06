'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Wallet as WalletType } from '@/lib/db'

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

export function WalletsManager({ initialWallets }: { initialWallets: WalletType[] }) {
  const router = useRouter()
  const [wallets, setWallets] = useState(initialWallets)
  const [isOpen, setIsOpen] = useState(false)
  const [editWallet, setEditWallet] = useState<WalletType | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      balance: Number(formData.get('balance')),
      currency: formData.get('currency') as string,
    }

    try {
      const res = await fetch('/api/wallets', {
        method: editWallet ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editWallet ? { ...data, id: editWallet.id } : data),
      })

      if (res.ok) {
        setIsOpen(false)
        setEditWallet(null)
        router.refresh()
        const updated = await res.json()
        if (editWallet) {
          setWallets(wallets.map((w) => (w.id === editWallet.id ? updated : w)))
        } else {
          setWallets([updated, ...wallets])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить кошелек?')) return

    const res = await fetch(`/api/wallets?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setWallets(wallets.filter((w) => w.id !== id))
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex justify-stretch sm:justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto">
              <Plus className="h-4 w-4 shrink-0" />
              Добавить кошелек
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editWallet ? 'Редактировать кошелек' : 'Новый кошелек'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Основной счет"
                  defaultValue={editWallet?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Баланс</Label>
                <Input
                  id="balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  defaultValue={editWallet?.balance}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <Select name="currency" defaultValue={editWallet?.currency || 'RUB'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите валюту" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUB">Рубли (RUB)</SelectItem>
                    <SelectItem value="USD">Доллары (USD)</SelectItem>
                    <SelectItem value="EUR">Евро (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((wallet) => (
          <Card
            key={wallet.id}
            className="border-border bg-card overflow-hidden"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 pb-2 pt-5 sm:gap-3 sm:px-6 sm:pt-6">
              <div className="min-w-0 flex-1 pr-1 sm:pr-2">
                <CardTitle
                  lang="ru"
                  className="whitespace-normal text-sm font-bold leading-snug text-foreground sm:text-base md:text-lg"
                >
                  <span className="wrap-break-word hyphens-auto">
                    {wallet.name}
                  </span>
                </CardTitle>
                {wallet.currency && wallet.currency !== 'RUB' ? (
                  <p className="mt-1 text-xs text-muted-foreground wrap-break-word">
                    {wallet.currency}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-0.5 self-start sm:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-11 w-11 touch-manipulation sm:h-9 sm:w-9 md:h-8 md:w-8"
                  onClick={() => {
                    setEditWallet(wallet)
                    setIsOpen(true)
                  }}
                  aria-label="Редактировать кошелёк"
                >
                  <Pencil className="h-4 w-4 shrink-0" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-11 w-11 touch-manipulation text-destructive hover:text-destructive sm:h-9 sm:w-9 md:h-8 md:w-8"
                  onClick={() => handleDelete(wallet.id)}
                  aria-label="Удалить кошелёк"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
              <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
                  <Wallet className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                </div>
                <p className="min-w-0 text-lg font-bold tabular-nums leading-tight sm:text-xl">
                  {formatCurrency(Number(wallet.balance), wallet.currency)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {wallets.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Нет кошельков</p>
            <p className="text-muted-foreground">Добавьте первый кошелек</p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
