'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Wallet as WalletType } from '@/lib/db'
import { sortWalletsWithPinnedBottom } from '@/lib/wallet-order'

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

type WalletRowProps = {
  wallet: WalletType
  onEdit: (w: WalletType) => void
  onDelete: (id: number, name?: string) => void
}

function WalletActions({
  wallet,
  onEdit,
  onDelete,
  className,
}: WalletRowProps & { className?: string }) {
  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-11 w-11 touch-manipulation sm:h-9 sm:w-9 md:h-8 md:w-8"
        onClick={() => onEdit(wallet)}
        aria-label="Редактировать кошелёк"
      >
        <Pencil className="h-4 w-4 shrink-0" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-11 w-11 touch-manipulation text-destructive hover:text-destructive sm:h-9 sm:w-9 md:h-8 md:w-8"
        onClick={() => onDelete(wallet.id, wallet.name)}
        aria-label="Удалить кошелёк"
      >
        <Trash2 className="h-4 w-4 shrink-0" />
      </Button>
    </div>
  )
}

export function WalletsManager({ initialWallets }: { initialWallets: WalletType[] }) {
  const router = useRouter()
  const [wallets, setWallets] = useState(initialWallets)
  const [isOpen, setIsOpen] = useState(false)
  const [editWallet, setEditWallet] = useState<WalletType | null>(null)
  const [loading, setLoading] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  useEffect(() => {
    setWallets(initialWallets)
  }, [initialWallets])

  const orderedWallets = useMemo(
    () => sortWalletsWithPinnedBottom(wallets),
    [wallets],
  )

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

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось сохранить кошелёк')
        return
      }
      const updated = (await res.json().catch(() => null)) as WalletType | null
      toast.success(editWallet ? 'Кошелёк обновлён' : 'Кошелёк добавлен')
      setIsOpen(false)
      const wasEdit = editWallet
      setEditWallet(null)
      if (updated) {
        setWallets((prev) =>
          wasEdit ? prev.map((w) => (w.id === wasEdit.id ? updated : w)) : [updated, ...prev],
        )
      }
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number, name?: string) {
    const ok = await confirm({
      title: 'Удалить кошелёк?',
      description: name
        ? `«${name}» будет удалён. Связанные операции останутся в истории, но потеряют ссылку на кошелёк.`
        : 'Действие нельзя отменить.',
      confirmLabel: 'Удалить',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/wallets?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось удалить кошелёк')
        return
      }
      toast.success('Кошелёк удалён')
      setWallets((prev) => prev.filter((w) => w.id !== id))
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    }
  }

  const walletForm = (
    <>
      <DialogHeader>
        <DialogTitle>
          {editWallet ? 'Редактировать кошелек' : 'Новый кошелек'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wallet-name">Название</Label>
          <Input
            id="wallet-name"
            name="name"
            placeholder="Основной счет"
            defaultValue={editWallet?.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wallet-balance">Баланс</Label>
          <Input
            id="wallet-balance"
            name="balance"
            type="number"
            step="0.01"
            placeholder="0"
            defaultValue={editWallet?.balance}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wallet-currency">Валюта</Label>
          <Select name="currency" defaultValue={editWallet?.currency || 'RUB'}>
            <SelectTrigger id="wallet-currency">
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
    </>
  )

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) setEditWallet(null)
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="h-11 w-full gap-2 sm:h-10 sm:w-auto sm:shrink-0"
              type="button"
              onClick={() => setEditWallet(null)}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Добавить кошелек
            </Button>
          </DialogTrigger>
          <DialogContent key={editWallet?.id ?? 'new'}>{walletForm}</DialogContent>
        </Dialog>
      </div>

      {orderedWallets.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card shadow-sm sm:rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center px-4 py-12 sm:px-6">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Нет кошельков</p>
            <p className="text-center text-muted-foreground">Добавьте первый кошелек</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {orderedWallets.map((wallet) => (
              <div
                key={wallet.id}
                className="overflow-hidden rounded-2xl border border-border bg-secondary/30 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p
                      lang="ru"
                      className="text-base font-bold leading-snug text-foreground wrap-break-word hyphens-auto"
                    >
                      {wallet.name}
                    </p>
                    {wallet.currency && wallet.currency !== 'RUB' ? (
                      <p className="mt-1 text-xs text-muted-foreground wrap-break-word">
                        {wallet.currency}
                      </p>
                    ) : null}
                  </div>
                  <WalletActions
                    className="flex shrink-0 gap-0.5 self-start"
                    wallet={wallet}
                    onEdit={(w) => {
                      setEditWallet(w)
                      setIsOpen(true)
                    }}
                    onDelete={handleDelete}
                  />
                </div>
                <div className="flex items-center gap-3 border-t border-border/50 bg-background/40 px-4 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <p className="min-w-0 text-lg font-bold tabular-nums leading-tight text-foreground">
                    {formatCurrency(Number(wallet.balance), wallet.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden gap-5 sm:grid sm:grid-cols-1 md:grid-cols-2 md:gap-6 2xl:grid-cols-3 2xl:gap-6">
            {orderedWallets.map((wallet) => (
              <Card
                key={wallet.id}
                className="min-w-0 gap-0 overflow-hidden rounded-3xl border-border bg-card py-0 shadow-sm"
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pb-3 sm:pt-6">
                  <div className="min-w-0 flex-1 pr-1">
                    <CardTitle
                      lang="ru"
                      title={wallet.name}
                      className="truncate text-base font-bold leading-tight text-foreground md:text-lg"
                    >
                      {wallet.name}
                    </CardTitle>
                    {wallet.currency && wallet.currency !== 'RUB' ? (
                      <p className="mt-1 text-xs text-muted-foreground wrap-break-word">
                        {wallet.currency}
                      </p>
                    ) : null}
                  </div>
                  <WalletActions
                    className="flex shrink-0 gap-0.5 self-start sm:gap-1"
                    wallet={wallet}
                    onEdit={(w) => {
                      setEditWallet(w)
                      setIsOpen(true)
                    }}
                    onDelete={handleDelete}
                  />
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <p className="min-w-0 text-xl font-bold tabular-nums leading-tight text-foreground">
                      {formatCurrency(Number(wallet.balance), wallet.currency)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      {dialog}
    </div>
  )
}
