'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, FileText, Check, X, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { PartnerRequest, Category } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusConfig = {
  pending: { label: 'На рассмотрении', icon: Clock, color: 'bg-warning/10 text-warning border-warning' },
  approved: { label: 'Одобрена', icon: Check, color: 'bg-success/10 text-success border-success' },
  rejected: { label: 'Отклонена', icon: X, color: 'bg-destructive/10 text-destructive border-destructive' },
}

export function PartnerDashboard({
  requests,
  categories: _categories,
  partnerId: _partnerId,
  bonusBalance,
}: {
  requests: PartnerRequest[]
  categories: Category[]
  partnerId: number
  bonusBalance: number
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      customer_phone: (formData.get('customer_phone') as string) || '',
      address: (formData.get('address') as string) || null,
      work_comment: (formData.get('work_comment') as string) || null,
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setIsOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Мои заявки</h1>
          <p className="text-muted-foreground">Создавайте заявки на расходы</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Новая заявка
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Заявка на установку сантехники</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Номер заказчика</Label>
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  placeholder="+7 (999) 123-45-67"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Адрес (необязательно)</Label>
                <Input id="address" name="address" placeholder="Город, улица, дом, кв." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_comment">Комментарий (что нужно сделать)</Label>
                <Textarea
                  id="work_comment"
                  name="work_comment"
                  placeholder="Например: установить унитаз/смеситель, заменить трубы..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Отправка...' : 'Отправить заявку'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(Number(bonusBalance))}</p>
              <p className="text-sm text-muted-foreground">Бонус</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">На рассмотрении</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <Check className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-sm text-muted-foreground">Одобрено</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-sm text-muted-foreground">Отклонено</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            История заявок
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Нет заявок</p>
              <p className="text-muted-foreground">Создайте первую заявку</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const config = statusConfig[request.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={request.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color.split(' ')[0]}`}>
                        <StatusIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{request.category_name}</p>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Заказчик: {request.customer_phone}</p>
                        {request.address && <p className="text-sm text-muted-foreground">Адрес: {request.address}</p>}
                        {request.work_comment && (
                          <p className="text-sm text-muted-foreground">{request.work_comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(request.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                        </p>
                        {request.admin_comment && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Комментарий: {request.admin_comment}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(Number(request.amount))}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
