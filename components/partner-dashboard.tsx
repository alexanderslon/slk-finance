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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RuPhoneField } from '@/components/ru-phone-field'
import { isCompleteRuMobile, ruPhoneDigits, formatCustomerPhoneDisplay } from '@/lib/phone-format'
import { Plus, FileText, Check, X, Clock, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { PartnerRequest, Category } from '@/lib/db'
import {
  estimatePartnerRequestBonus,
  PARTNER_BONUS_BASE_RUB,
  PARTNER_BONUS_PER_SQM_RUB,
  PARTNER_SQM_SELECT_OPTIONS,
} from '@/lib/partner-bonus'

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
  const [sqmChoice, setSqmChoice] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPhoneError('')
    if (!isCompleteRuMobile(ruPhoneDigits(customerPhone))) {
      setPhoneError('Введите полный номер: +7 и 10 цифр')
      return
    }

    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      customer_phone: customerPhone.trim(),
      address: (formData.get('address') as string) || null,
      work_comment: (formData.get('work_comment') as string) || null,
      ...(sqmChoice ? { square_meters: sqmChoice } : {}),
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setIsOpen(false)
        setCustomerPhone('')
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
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (open) {
              setSqmChoice('')
              setCustomerPhone('')
              setPhoneError('')
            }
          }}
        >
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
                <RuPhoneField
                  id="customer_phone"
                  value={customerPhone}
                  onChange={(v) => {
                    setCustomerPhone(v)
                    setPhoneError('')
                  }}
                />
                {phoneError ? (
                  <p className="text-sm text-destructive">{phoneError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Вводите цифры — номер подставится в формат +7 (999) 123-45-67
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Адрес (необязательно)</Label>
                <Input id="address" name="address" placeholder="Город, улица, дом, кв." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="square_meters">Квадратура, м² (необязательно)</Label>
                <Select
                  value={sqmChoice === '' ? 'none' : sqmChoice}
                  onValueChange={(v) => setSqmChoice(v === 'none' ? '' : v)}
                >
                  <SelectTrigger id="square_meters" className="w-full">
                    <SelectValue placeholder="Не указывать" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указывать</SelectItem>
                    {PARTNER_SQM_SELECT_OPTIONS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} м²
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Целые м²: к бонусу +{PARTNER_BONUS_PER_SQM_RUB.toLocaleString('ru-RU')} ₽ за каждый м²
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_comment">Комментарий (что нужно сделать)</Label>
                <Textarea
                  id="work_comment"
                  name="work_comment"
                  placeholder="Например: установить унитаз/смеситель, заменить трубы..."
                />
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Предположительный бонус
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(
                    estimatePartnerRequestBonus(sqmChoice === '' ? null : Number(sqmChoice)),
                  )}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {PARTNER_BONUS_BASE_RUB.toLocaleString('ru-RU')} ₽ за заявку
                  {sqmChoice
                    ? ` + ${sqmChoice} × ${PARTNER_BONUS_PER_SQM_RUB.toLocaleString('ru-RU')} ₽ за м²`
                    : ' (квадратура не указана — без доплаты за м²)'}
                  . Фактическое начисление после одобрения администратором может отличаться.
                </p>
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
                        <p className="text-sm text-muted-foreground font-mono tabular-nums">
                          Заказчик: {formatCustomerPhoneDisplay(request.customer_phone)}
                        </p>
                        {request.address && <p className="text-sm text-muted-foreground">Адрес: {request.address}</p>}
                        {request.square_meters != null && Number(request.square_meters) > 0 && (
                          <p className="text-sm text-muted-foreground">
                            Квадратура: {Math.floor(Number(request.square_meters))} м²
                          </p>
                        )}
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
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Предположительный бонус</p>
                      <p className="text-lg font-semibold text-primary tabular-nums">
                        {formatCurrency(estimatePartnerRequestBonus(request.square_meters))}
                      </p>
                      {request.status === 'approved' && Number(request.amount) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Списание: {formatCurrency(Number(request.amount))}
                        </p>
                      )}
                    </div>
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
