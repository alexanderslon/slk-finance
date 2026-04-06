'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePartnerUi } from '@/contexts/partner-ui-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RuPhoneField } from '@/components/ru-phone-field'
import {
  isCompleteRuMobile,
  ruPhoneDigits,
  formatCustomerPhoneDisplay,
  RU_PHONE_FIELD_PREFIX,
} from '@/lib/phone-format'
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
import { cn } from '@/lib/utils'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Зона ввода в форме заявки: заметная рамка и подсветка при фокусе внутри */
const partnerRequestFieldClass =
  'space-y-2 rounded-2xl border-2 border-primary/25 bg-primary/[0.07] p-3.5 shadow-sm ring-offset-background transition-[border-color,box-shadow,background-color] focus-within:border-primary/50 focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/25 dark:bg-primary/[0.1] dark:focus-within:bg-primary/[0.14]'

const partnerRequestControlClass =
  'border-primary/20 bg-background shadow-sm dark:border-primary/25 dark:bg-background'

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
  const { newRequestOpen, setNewRequestOpen } = usePartnerUi()
  const [loading, setLoading] = useState(false)
  const [sqmChoice, setSqmChoice] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState(RU_PHONE_FIELD_PREFIX)
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
        setNewRequestOpen(false)
        setCustomerPhone(RU_PHONE_FIELD_PREFIX)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Мои заявки</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Создайте заявку для получения бонуса
          </p>
        </div>
        <Drawer
          open={newRequestOpen}
          onOpenChange={(open) => {
            setNewRequestOpen(open)
            if (open) {
              setSqmChoice('')
              setCustomerPhone(RU_PHONE_FIELD_PREFIX)
              setPhoneError('')
            }
          }}
          fixed
          repositionInputs={false}
        >
          <DrawerTrigger asChild>
            <Button className="hidden h-11 gap-2 md:inline-flex md:h-10">
              <Plus className="h-4 w-4 shrink-0" />
              Новая заявка
            </Button>
          </DrawerTrigger>
          <DrawerContent className="flex max-h-[min(92dvh,calc(100svh-1rem))] flex-col gap-0 overflow-hidden p-0 pt-[env(safe-area-inset-top,0px)] [&>div:first-child]:mt-2">
            <DrawerHeader className="shrink-0 space-y-1 border-b border-border px-4 pb-3 pt-1 text-left sm:pt-0">
              <DrawerTitle className="text-lg leading-snug">Заявка на установку сантехники</DrawerTitle>
              <DrawerDescription className="sr-only">
                Укажите телефон заказчика и при необходимости адрес и комментарий
              </DrawerDescription>
            </DrawerHeader>
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-2 pt-2 [-webkit-overflow-scrolling:touch]"
                style={{
                  scrollPaddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
                  scrollPaddingBottom: '12px',
                }}
              >
                <div className="space-y-4 pb-2">
                  <div
                    className={cn(
                      partnerRequestFieldClass,
                      'scroll-mt-[max(0.5rem,env(safe-area-inset-top,0px))]',
                    )}
                  >
                    <Label htmlFor="customer_phone" className="font-medium">
                      Номер заказчика
                    </Label>
                    <RuPhoneField
                      id="customer_phone"
                      value={customerPhone}
                      onChange={(v) => {
                        setCustomerPhone(v)
                        setPhoneError('')
                      }}
                      className={partnerRequestControlClass}
                    />
                    {phoneError ? (
                      <p className="text-sm text-destructive">{phoneError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-snug">
                        Вводите цифры — номер в формате +7 (999) 123-45-67
                      </p>
                    )}
                  </div>

                  <div className={partnerRequestFieldClass}>
                    <Label htmlFor="address" className="font-medium">
                      Адрес (необязательно)
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="Город, улица, дом, кв."
                      className={cn(
                        'min-h-11 text-base sm:min-h-10 sm:text-sm',
                        partnerRequestControlClass,
                      )}
                    />
                  </div>

                  <div className={partnerRequestFieldClass}>
                    <Label htmlFor="square_meters" className="font-medium">
                      Квадратура, м² (необязательно)
                    </Label>
                    <Select
                      value={sqmChoice === '' ? 'none' : sqmChoice}
                      onValueChange={(v) => setSqmChoice(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger
                        id="square_meters"
                        className={cn(
                          'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                          partnerRequestControlClass,
                        )}
                      >
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
                    <p className="text-xs text-muted-foreground leading-snug">
                      Целые м²: к бонусу +{PARTNER_BONUS_PER_SQM_RUB.toLocaleString('ru-RU')} ₽ за каждый м²
                    </p>
                  </div>

                  <div className={partnerRequestFieldClass}>
                    <Label htmlFor="work_comment" className="font-medium">
                      Комментарий (что нужно сделать)
                    </Label>
                    <Textarea
                      id="work_comment"
                      name="work_comment"
                      placeholder="Например: установить унитаз/смеситель, заменить трубы..."
                      className={cn(
                        'min-h-[100px] text-base sm:text-sm',
                        partnerRequestControlClass,
                      )}
                    />
                  </div>

                  <div className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
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
                      . Фактическое начисление после одобрения админом может отличаться.
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="shrink-0 border-t border-border bg-background px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]"
                style={{
                  paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
                }}
              >
                <Button type="submit" className="h-11 w-full sm:h-10" disabled={loading}>
                  {loading ? 'Отправка...' : 'Отправить заявку'}
                </Button>
              </div>
            </form>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4 pt-5 sm:gap-4 sm:pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
              <Plus className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tabular-nums sm:text-2xl">
                {formatCurrency(Number(bonusBalance))}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">Бонус</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4 pt-5 sm:gap-4 sm:pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 sm:h-12 sm:w-12">
              <Clock className="h-5 w-5 text-warning sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums sm:text-2xl">{pendingCount}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">На рассмотрении</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4 pt-5 sm:gap-4 sm:pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 sm:h-12 sm:w-12">
              <Check className="h-5 w-5 text-success sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums sm:text-2xl">{approvedCount}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Одобрено</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4 pt-5 sm:gap-4 sm:pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 sm:h-12 sm:w-12">
              <X className="h-5 w-5 text-destructive sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums sm:text-2xl">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">Отклонено</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card id="partner-requests-history" className="scroll-mt-4 border-border bg-card">
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
              <p className="text-muted-foreground">Создайте заявку для получения бонуса</p>
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
