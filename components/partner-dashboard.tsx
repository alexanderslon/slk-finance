'use client'

import { useState, useEffect } from 'react'
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
import { Plus, FileText, Check, X, Clock, Sparkles, Banknote } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { PartnerRequest, Category } from '@/lib/db'
import {
  estimatePartnerRequestBonus,
  isReducedPartnerBonusCategory,
  PARTNER_BONUS_BASE_RUB,
  PARTNER_BONUS_PER_SQM_RUB,
  PARTNER_BONUS_REDUCED_BASE_RUB,
  PARTNER_SQM_SELECT_OPTIONS,
} from '@/lib/partner-bonus'
import { cn } from '@/lib/utils'
import { PartnerHelpCard } from '@/components/partner-help-card'

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

type ServiceId =
  | 'apartment'
  | 'fence'
  | 'bath'
  | 'mixer'
  | 'toilet'
  | 'vanity'
  | 'glass_screen'
  | 'tropical_shower'
  | 'shower_cabin'

const GLASS_THICKNESS_MM = [6, 8, 10] as const
const GLASS_SCREEN_WIDTH_CM = [50, 60, 70, 80, 90, 100, 110, 120, 130, 135] as const

const SHOWER_CABIN_SIZES = [
  '80×80',
  '90×90',
  '100×100',
  '110×90',
  '120×90',
  '110×100',
  '120×100',
] as const

const SERVICE_PRESETS: Array<{
  id: ServiceId
  label: string
  categoryName: string
}> = [
  {
    id: 'apartment',
    label: 'Квартира',
    categoryName: 'Квартира',
  },
  {
    id: 'fence',
    label: 'Ограждение',
    categoryName: 'Ограждение',
  },
  {
    id: 'shower_cabin',
    label: 'Душевая кабина',
    categoryName: 'Душевая кабина',
  },
  {
    id: 'bath',
    label: 'Ванна',
    categoryName: 'Ванна',
  },
  {
    id: 'mixer',
    label: 'Смеситель',
    categoryName: 'Смеситель',
  },
  {
    id: 'toilet',
    label: 'Унитаз',
    categoryName: 'Унитаз',
  },
  {
    id: 'vanity',
    label: 'Тумба с раковиной',
    categoryName: 'Тумба с раковиной',
  },
  {
    id: 'glass_screen',
    label: 'Стеклянный экран',
    categoryName: 'Стеклянный экран',
  },
  {
    id: 'tropical_shower',
    label: 'Смеситель с тропическим душем',
    categoryName: 'Смеситель с тропическим душем',
  },
]

export function PartnerDashboard({
  requests,
  categories: _categories,
  partnerId: _partnerId,
  partnerName,
  partnerPhone,
  bonusBalance,
}: {
  requests: PartnerRequest[]
  categories: Category[]
  partnerId: number
  partnerName: string
  partnerPhone?: string | null
  bonusBalance: number
}) {
  const router = useRouter()
  const {
    newRequestOpen,
    setNewRequestOpen,
    registerPrepareGenericNewRequest,
    openGenericNewRequest,
  } = usePartnerUi()

  useEffect(() => {
    registerPrepareGenericNewRequest(() => setServiceId(null))
    return () => registerPrepareGenericNewRequest(null)
  }, [registerPrepareGenericNewRequest])
  const [loading, setLoading] = useState(false)
  const [sqmChoice, setSqmChoice] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState(RU_PHONE_FIELD_PREFIX)
  const [customerName, setCustomerName] = useState<string>('')
  const [phoneError, setPhoneError] = useState('')
  const [submitError, setSubmitError] = useState<string>('')
  const [serviceId, setServiceId] = useState<ServiceId | null>(null)

  const [fenceSize, setFenceSize] = useState<string>('')
  const [bathMaterial, setBathMaterial] = useState<string>('')
  const [bathSize, setBathSize] = useState<string>('')
  const [mixerPlace, setMixerPlace] = useState<string>('')
  const [toiletType, setToiletType] = useState<string>('')
  const [toiletReplace, setToiletReplace] = useState<string>('')
  const [vanityType, setVanityType] = useState<string>('')
  const [vanitySize, setVanitySize] = useState<string>('')
  const [glassThicknessMm, setGlassThicknessMm] = useState<string>('')
  const [glassScreenWidthCm, setGlassScreenWidthCm] = useState<string>('')
  const [showerCabinSize, setShowerCabinSize] = useState<string>('')

  const selectedService = serviceId ? SERVICE_PRESETS.find((s) => s.id === serviceId) : null

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPhoneError('')
    setSubmitError('')
    if (!serviceId || !selectedService) {
      setSubmitError('Выберите категорию')
      return
    }
    if (!isCompleteRuMobile(ruPhoneDigits(customerPhone))) {
      setPhoneError('Введите полный номер: +7 и 10 цифр')
      return
    }

    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = String(formData.get('customer_name') || '').trim()
    const rawComment = String(formData.get('work_comment') || '').trim()

    const serviceLines: string[] = []
    if (selectedService) serviceLines.push(`Услуга: ${selectedService.label}`)
    if (serviceId === 'fence' && fenceSize) serviceLines.push(`Ограждение: ${fenceSize}`)
    if (serviceId === 'bath') {
      if (bathMaterial) serviceLines.push(`Ванна: ${bathMaterial}`)
      if (bathSize) serviceLines.push(`Размер ванны: ${bathSize}`)
    }
    if (serviceId === 'mixer' && mixerPlace) serviceLines.push(`Смеситель: ${mixerPlace}`)
    if (serviceId === 'toilet') {
      if (toiletType) serviceLines.push(`Унитаз: ${toiletType}`)
      if (toiletReplace) serviceLines.push(`Замена: ${toiletReplace}`)
    }
    if (serviceId === 'vanity') {
      if (vanityType) serviceLines.push(`Тумба: ${vanityType}`)
      if (vanitySize) serviceLines.push(`Размер тумбы: ${vanitySize}`)
    }
    if (serviceId === 'glass_screen') {
      if (glassThicknessMm) serviceLines.push(`Толщина стекла: ${glassThicknessMm} мм`)
      if (glassScreenWidthCm) serviceLines.push(`Размер (ширина): ${glassScreenWidthCm} см`)
    }
    if (serviceId === 'shower_cabin' && showerCabinSize) {
      serviceLines.push(`Размер кабины: ${showerCabinSize}`)
    }

    const combinedComment = [name ? `Имя: ${name}` : null, ...serviceLines, rawComment ? `Комментарий: ${rawComment}` : null]
      .filter(Boolean)
      .join('\n')

    const data = {
      customer_phone: customerPhone.trim(),
      address: (formData.get('address') as string) || null,
      category_name: selectedService.categoryName,
      work_volume: selectedService.label,
      recommended_specialist: (formData.get('recommended_specialist') as string) || null,
      work_comment: combinedComment || null,
      ...(serviceId === 'apartment' && sqmChoice ? { square_meters: sqmChoice } : {}),
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        setNewRequestOpen(false)
        setCustomerPhone(RU_PHONE_FIELD_PREFIX)
        router.refresh()
      } else {
        const text = await res.text().catch(() => '')
        // Пытаемся показать нормальную ошибку из API
        try {
          const parsed = JSON.parse(text) as { error?: string; detail?: string }
          const base = parsed?.error ? String(parsed.error) : 'Не удалось отправить заявку'
          const detail = parsed?.detail ? ` — ${String(parsed.detail)}` : ''
          setSubmitError(base + detail)
        } catch {
          setSubmitError(text || 'Не удалось отправить заявку')
        }
      }
    } catch (err) {
      const aborted = String(err).toLowerCase().includes('abort')
      setSubmitError(aborted ? 'Сервер не ответил вовремя. Попробуйте ещё раз.' : 'Ошибка отправки заявки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="order-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">Мои заявки</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Создайте заявку для начисления бонуса
          </p>
        </div>
        <Drawer
          open={newRequestOpen}
          onOpenChange={(open) => {
            setNewRequestOpen(open)
            if (open) {
              setSubmitError('')
              setSqmChoice('')
              setCustomerPhone(RU_PHONE_FIELD_PREFIX)
              setCustomerName('')
              setPhoneError('')
              setFenceSize('')
              setBathMaterial('')
              setBathSize('')
              setMixerPlace('')
              setToiletType('')
              setToiletReplace('')
              setVanityType('')
              setVanitySize('')
              setGlassThicknessMm('')
              setGlassScreenWidthCm('')
              setShowerCabinSize('')
            }
          }}
          fixed
          repositionInputs={false}
        >
          <Button
            type="button"
            className="hidden h-11 gap-2 md:inline-flex md:h-10"
            onClick={() => openGenericNewRequest()}
          >
            <Plus className="h-4 w-4 shrink-0" />
            Новая заявка
          </Button>
          <DrawerContent className="flex max-h-[min(92dvh,calc(100svh-1rem))] flex-col gap-0 overflow-hidden p-0 pt-[env(safe-area-inset-top,0px)] [&>div:first-child]:mt-2">
            <DrawerHeader className="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-1 text-left sm:space-y-3 sm:pt-0">
              <DrawerTitle className="text-lg leading-snug">Новая заявка</DrawerTitle>
              <div className={cn(partnerRequestFieldClass, 'space-y-2')}>
                <Label htmlFor="request_category" className="font-medium">
                  Категория
                </Label>
                <Select
                  value={serviceId ?? 'none'}
                  onValueChange={(v) => {
                    const id = v === 'none' ? null : (v as ServiceId)
                    setServiceId(id)
                    if (id !== 'apartment') setSqmChoice('')
                    if (id !== 'glass_screen') {
                      setGlassThicknessMm('')
                      setGlassScreenWidthCm('')
                    }
                    if (id !== 'shower_cabin') setShowerCabinSize('')
                    setSubmitError('')
                  }}
                >
                  <SelectTrigger
                    id="request_category"
                    className={cn(
                      'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                      partnerRequestControlClass,
                    )}
                  >
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Выберите категорию</SelectItem>
                    {SERVICE_PRESETS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DrawerDescription className="sr-only">
                Выберите категорию, укажите телефон заказчика и при необходимости адрес и детали по объекту
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
                    <Label htmlFor="customer_name" className="font-medium">
                      Имя заказчика
                    </Label>
                    <Input
                      id="customer_name"
                      name="customer_name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Имя"
                      className={cn(
                        'min-h-11 text-base sm:min-h-10 sm:text-sm',
                        partnerRequestControlClass,
                      )}
                    />
                  </div>

                  <div className={partnerRequestFieldClass}>
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

                  {serviceId === 'fence' ? (
                    <div className={partnerRequestFieldClass}>
                      <Label htmlFor="fence_size" className="font-medium">
                        Размер ограждения
                      </Label>
                      <Select value={fenceSize || 'none'} onValueChange={(v) => setFenceSize(v === 'none' ? '' : v)}>
                        <SelectTrigger
                          id="fence_size"
                          className={cn(
                            'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                            partnerRequestControlClass,
                          )}
                        >
                          <SelectValue placeholder="Выберите размер" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбрано</SelectItem>
                          {['80×80', '90×90', '100×90', '100×100', '110×90', '120×90'].map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {serviceId === 'bath' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="bath_material" className="font-medium">
                          Ванна (материал)
                        </Label>
                        <Select value={bathMaterial || 'none'} onValueChange={(v) => setBathMaterial(v === 'none' ? '' : v)}>
                          <SelectTrigger
                            id="bath_material"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Выберите материал" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {['Камень', 'Акрил', 'Чугун', 'Сталь'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="bath_size" className="font-medium">
                          Размер ванны
                        </Label>
                        <Select value={bathSize || 'none'} onValueChange={(v) => setBathSize(v === 'none' ? '' : v)}>
                          <SelectTrigger
                            id="bath_size"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Выберите размер" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {['150', '160', '170', '180'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {serviceId === 'mixer' ? (
                    <div className={partnerRequestFieldClass}>
                      <Label htmlFor="mixer_place" className="font-medium">
                        Смеситель
                      </Label>
                      <Select value={mixerPlace || 'none'} onValueChange={(v) => setMixerPlace(v === 'none' ? '' : v)}>
                        <SelectTrigger
                          id="mixer_place"
                          className={cn(
                            'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                            partnerRequestControlClass,
                          )}
                        >
                          <SelectValue placeholder="Ванна / кухня / раковина" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбрано</SelectItem>
                          {['Ванна', 'Кухня', 'Раковина'].map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {serviceId === 'toilet' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="toilet_type" className="font-medium">
                          Тип унитаза
                        </Label>
                        <Select value={toiletType || 'none'} onValueChange={(v) => setToiletType(v === 'none' ? '' : v)}>
                          <SelectTrigger
                            id="toilet_type"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {['Напольный', 'Инсталляция'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="toilet_replace" className="font-medium">
                          С заменой?
                        </Label>
                        <Select value={toiletReplace || 'none'} onValueChange={(v) => setToiletReplace(v === 'none' ? '' : v)}>
                          <SelectTrigger
                            id="toilet_replace"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Выберите вариант" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {['С заменой', 'Без замены'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {serviceId === 'vanity' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="vanity_type" className="font-medium">
                          Тумба
                        </Label>
                        <Select value={vanityType || 'none'} onValueChange={(v) => setVanityType(v === 'none' ? '' : v)}>
                          <SelectTrigger
                            id="vanity_type"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Подвесная / напольная" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {['Подвесная', 'Напольная'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="vanity_size" className="font-medium">
                          Размер
                        </Label>
                        <Select value={vanitySize || 'none'} onValueChange={(v) => setVanitySize(v === 'none' ? '' : v)}>
                          <SelectTrigger
                            id="vanity_size"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="40–100" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {['40', '50', '60', '70', '80', '90', '100'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

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

                  {serviceId === 'shower_cabin' ? (
                    <div className={partnerRequestFieldClass}>
                      <Label htmlFor="shower_cabin_size" className="font-medium">
                        Размер кабины
                      </Label>
                      <Select
                        value={showerCabinSize || 'none'}
                        onValueChange={(v) => setShowerCabinSize(v === 'none' ? '' : v)}
                      >
                        <SelectTrigger
                          id="shower_cabin_size"
                          className={cn(
                            'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                            partnerRequestControlClass,
                          )}
                        >
                          <SelectValue placeholder="Выберите размер" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбрано</SelectItem>
                          {SHOWER_CABIN_SIZES.map((sz) => (
                            <SelectItem key={sz} value={sz}>
                              {sz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {serviceId === 'glass_screen' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="glass_thickness" className="font-medium">
                          Толщина стекла, мм
                        </Label>
                        <Select
                          value={glassThicknessMm || 'none'}
                          onValueChange={(v) => setGlassThicknessMm(v === 'none' ? '' : v)}
                        >
                          <SelectTrigger
                            id="glass_thickness"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Выберите толщину" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {GLASS_THICKNESS_MM.map((mm) => (
                              <SelectItem key={mm} value={String(mm)}>
                                {mm} мм
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={partnerRequestFieldClass}>
                        <Label htmlFor="glass_width" className="font-medium">
                          Размер, см
                        </Label>
                        <Select
                          value={glassScreenWidthCm || 'none'}
                          onValueChange={(v) => setGlassScreenWidthCm(v === 'none' ? '' : v)}
                        >
                          <SelectTrigger
                            id="glass_width"
                            className={cn(
                              'min-h-11 w-full text-base sm:min-h-10 sm:text-sm',
                              partnerRequestControlClass,
                            )}
                          >
                            <SelectValue placeholder="Ширина экрана" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбрано</SelectItem>
                            {GLASS_SCREEN_WIDTH_CM.map((w) => (
                              <SelectItem key={w} value={String(w)}>
                                {w} см
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {serviceId === 'apartment' ? (
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
                  ) : null}

                  {serviceId !== 'glass_screen' &&
                  serviceId !== 'tropical_shower' &&
                  serviceId !== 'shower_cabin' ? (
                    <div className={partnerRequestFieldClass}>
                      <Label htmlFor="recommended_specialist" className="font-medium">
                        Рекомендованный специалист (необязательно)
                      </Label>
                      <Input
                        id="recommended_specialist"
                        name="recommended_specialist"
                        placeholder="Например: Сергей, сантехник"
                        className={cn(
                          'min-h-11 text-base sm:min-h-10 sm:text-sm',
                          partnerRequestControlClass,
                        )}
                      />
                      <p className="text-xs text-muted-foreground leading-snug">
                        Если вы посоветовали конкретного мастера — укажите имя или роль.
                      </p>
                    </div>
                  ) : null}

                  <div className={partnerRequestFieldClass}>
                    <Label htmlFor="work_comment" className="font-medium">
                      Комментарий по объекту
                    </Label>
                    <Textarea
                      id="work_comment"
                      name="work_comment"
                      placeholder="Например: ремонт квартиры под ключ, ограждение, сантехника, замена водопровода"
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
                    {selectedService ? (
                      <>
                        <p className="text-2xl font-bold tabular-nums">
                          {formatCurrency(
                            estimatePartnerRequestBonus(
                              serviceId === 'apartment' && sqmChoice !== '' ? Number(sqmChoice) : null,
                              selectedService.categoryName,
                            ),
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isReducedPartnerBonusCategory(selectedService.categoryName)
                            ? `${PARTNER_BONUS_REDUCED_BASE_RUB.toLocaleString('ru-RU')} ₽ фиксированный бонус за эту категорию`
                            : `${PARTNER_BONUS_BASE_RUB.toLocaleString('ru-RU')} ₽ за заявку${
                                serviceId === 'apartment' && sqmChoice
                                  ? ` + ${sqmChoice} × ${PARTNER_BONUS_PER_SQM_RUB.toLocaleString('ru-RU')} ₽ за м²`
                                  : ' (квадратура не указана — без доплаты за м²)'
                              }`}
                          . Фактическое начисление после одобрения админом может отличаться.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-medium text-muted-foreground">Выберите категорию</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          После выбора покажем ориентировочный размер бонуса.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="shrink-0 border-t border-border bg-background px-4 pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]"
                style={{
                  paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
                }}
              >
                {submitError ? (
                  <p className="mb-2 text-sm text-destructive">{submitError}</p>
                ) : null}
                <Button type="submit" className="h-11 w-full sm:h-10" disabled={loading}>
                  {loading ? 'Отправка...' : 'Отправить заявку'}
                </Button>
              </div>
            </form>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="order-2 space-y-2">
        <p className="text-sm font-medium text-foreground">Сводка</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            {
              key: 'bonus',
              value: formatCurrency(Number(bonusBalance)),
              label: 'Бонус',
              icon: Banknote,
              iconWrap: 'bg-primary/10 text-primary',
            },
            {
              key: 'pending',
              value: String(pendingCount),
              label: 'На рассмотрении',
              icon: Clock,
              iconWrap: 'bg-warning/10 text-warning',
            },
            {
              key: 'approved',
              value: String(approvedCount),
              label: 'Одобрено',
              icon: Check,
              iconWrap: 'bg-success/10 text-success',
            },
            {
              key: 'rejected',
              value: String(rejectedCount),
              label: 'Отклонено',
              icon: X,
              iconWrap: 'bg-destructive/10 text-destructive',
            },
          ].map(({ key, value, label, icon: Icon, iconWrap }) => (
            <Card key={key} className="flex h-full flex-col border-border bg-card shadow-none">
              <CardContent className="flex flex-1 items-center gap-3 p-4 sm:gap-3.5">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11',
                    iconWrap,
                  )}
                >
                  <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-lg font-bold tabular-nums leading-none tracking-tight sm:text-xl">
                    {value}
                  </p>
                  <p className="text-pretty text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    {label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="order-3 space-y-2">
        <p className="text-sm font-medium text-foreground">Категории</p>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Выберите тип работы — откроется форма заявки
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_PRESETS.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant={serviceId === s.id ? 'default' : 'outline'}
              className={cn(
                'h-auto min-h-11 max-w-full justify-center rounded-2xl px-3.5 py-2.5 text-left text-sm leading-snug sm:min-h-10 sm:px-4',
                'whitespace-normal sm:text-sm',
              )}
              onClick={() => {
                setServiceId(s.id)
                if (s.id !== 'apartment') setSqmChoice('')
                if (s.id !== 'glass_screen') {
                  setGlassThicknessMm('')
                  setGlassScreenWidthCm('')
                }
                if (s.id !== 'shower_cabin') setShowerCabinSize('')
                setSubmitError('')
                setNewRequestOpen(true)
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <Card
        id="partner-requests-history"
        className="order-5 border-border bg-card scroll-mt-4 md:order-4"
      >
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
                        {request.actual_work_volume && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Фактический объём работ: {request.actual_work_volume}
                          </p>
                        )}
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
                        {formatCurrency(
                          estimatePartnerRequestBonus(
                            request.square_meters,
                            request.category_name ?? null,
                          ),
                        )}
                      </p>
                      {request.status === 'approved' && Number(request.amount) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Начислено: {formatCurrency(Number(request.amount))}
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

      <div className="order-4 md:order-5">
        <PartnerHelpCard profilePhone={partnerPhone ?? null} />
      </div>
    </div>
  )
}
