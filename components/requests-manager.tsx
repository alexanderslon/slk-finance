'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Check, X, Clock, Download, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { PartnerRequest, Wallet } from '@/lib/db'
import { estimatePartnerRequestBonus } from '@/lib/partner-bonus'
import { formatCustomerPhoneDisplay } from '@/lib/phone-format'
import { downloadCsv, todayStampForFilename, toCsv } from '@/lib/csv'
import {
  buildMonthSelectOptions,
  transactionMonthKey,
  transactionMonthTitleRu,
} from '@/lib/transaction-dates'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function currentCalendarMonthKey(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Месяц по умолчанию для админки заявок: самый свежий месяц, в котором что-то
 * есть. Если данных нет — текущий календарный, чтобы фильтр выглядел осмысленно
 * вместо «прыжка» в режим «все месяцы».
 */
function pickDefaultMonth(requests: readonly PartnerRequest[]): string {
  if (requests.length === 0) return currentCalendarMonthKey()
  let latest = ''
  for (const r of requests) {
    const k = transactionMonthKey(r.created_at)
    if (k > latest) latest = k
  }
  return latest || currentCalendarMonthKey()
}

const statusConfig = {
  pending: { label: 'Ожидает', icon: Clock, color: 'bg-warning/10 text-warning border-warning' },
  approved: { label: 'Одобрена', icon: Check, color: 'bg-success/10 text-success border-success' },
  rejected: { label: 'Отклонена', icon: X, color: 'bg-destructive/10 text-destructive border-destructive' },
}

export function RequestsManager({
  initialRequests,
  wallets,
}: {
  initialRequests: PartnerRequest[]
  wallets: Wallet[]
}) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [selectedRequest, setSelectedRequest] = useState<PartnerRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)
  /** Radix Select не участвует в FormData — значение кошелька держим здесь и дублируем в hidden input */
  const [approveWalletId, setApproveWalletId] = useState('')
  const [actionError, setActionError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'all',
  )
  const [search, setSearch] = useState('')
  // По умолчанию открываем самый свежий месяц с заявками — иначе вся лента
  // за всё время грузится длинным потоком и теряется ощущение актуальности.
  const [monthFilter, setMonthFilter] = useState<string>(() => pickDefaultMonth(initialRequests))

  useEffect(() => {
    setRequests(initialRequests)
  }, [initialRequests])

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  const monthOptions = useMemo(
    () => buildMonthSelectOptions(initialRequests),
    [initialRequests],
  )

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (monthFilter !== 'all' && transactionMonthKey(r.created_at) !== monthFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (needle) {
        const haystack = [
          r.partner_name,
          r.category_name,
          r.customer_phone,
          r.address,
          r.work_volume,
          r.work_comment,
          r.actual_work_volume,
          r.admin_comment,
          r.recommended_specialist,
          String(r.amount),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [requests, monthFilter, statusFilter, search])

  // Группировка по месяцам (новые сверху). Внутри сохраняем порядок из исходного
  // массива (server отдаёт по created_at DESC), поэтому свежее в начале блока.
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, PartnerRequest[]>()
    for (const r of filteredRequests) {
      const key = transactionMonthKey(r.created_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredRequests])

  function handleExportCsv() {
    if (filteredRequests.length === 0) {
      toast.info('Нет заявок для экспорта по текущим фильтрам')
      return
    }
    const csv = toCsv(filteredRequests, [
      {
        key: 'created_at',
        label: 'Дата',
        map: (r) => format(new Date(r.created_at), 'd MMM yyyy HH:mm', { locale: ru }),
      },
      {
        key: 'status',
        label: 'Статус',
        map: (r) => statusConfig[r.status]?.label ?? r.status,
      },
      { key: 'partner_name', label: 'Партнёр', map: (r) => r.partner_name ?? '' },
      { key: 'category_name', label: 'Категория', map: (r) => r.category_name ?? '' },
      { key: 'customer_phone', label: 'Телефон заказчика', map: (r) => r.customer_phone ?? '' },
      { key: 'address', label: 'Адрес', map: (r) => r.address ?? '' },
      {
        key: 'square_meters',
        label: 'Площадь, м²',
        map: (r) => (r.square_meters != null ? Number(r.square_meters) : ''),
      },
      { key: 'amount', label: 'Сумма, ₽', map: (r) => Number(r.amount) },
      {
        key: 'work_volume',
        label: 'Объём в заявке',
        map: (r) => r.work_volume ?? '',
      },
      {
        key: 'actual_work_volume',
        label: 'Фактический объём',
        map: (r) => r.actual_work_volume ?? '',
      },
      { key: 'work_comment', label: 'Комментарий партнёра', map: (r) => r.work_comment ?? '' },
      { key: 'admin_comment', label: 'Комментарий админа', map: (r) => r.admin_comment ?? '' },
    ])
    downloadCsv(`requests-${todayStampForFilename()}.csv`, csv)
    toast.success(`Экспортировано ${filteredRequests.length} заявок`)
  }

  useEffect(() => {
    setActionError('')
    if (actionType === 'approve') setApproveWalletId('')
  }, [selectedRequest?.id, actionType])

  async function handleAction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedRequest || !actionType) return
    setActionError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const rawActualVol = String(formData.get('actual_work_volume') || '').trim()

    let walletId: number | null = null
    if (actionType === 'approve') {
      const raw = formData.get('wallet_id')
      const n = Number(raw)
      if (raw == null || raw === '' || !Number.isFinite(n) || n <= 0) {
        setActionError('Выберите кошелёк для списания')
        setLoading(false)
        return
      }
      walletId = n
    }

    const data = {
      id: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      admin_comment: (formData.get('admin_comment') as string) || null,
      actual_work_volume: rawActualVol || null,
      wallet_id: walletId,
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        toast.success(actionType === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена')
        setSelectedRequest(null)
        setActionType(null)
        setApproveWalletId('')
        router.refresh()
      } else {
        let message = 'Не удалось сохранить решение'
        try {
          const j = (await res.json()) as { error?: string; detail?: string }
          if (j?.error) message = String(j.error)
          if (j?.detail) message += ` — ${String(j.detail)}`
        } catch {
          /* ignore */
        }
        setActionError(message)
        toast.error(message)
      }
    } catch {
      setActionError('Ошибка сети. Проверьте подключение и попробуйте снова.')
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null)
            setActionType(null)
            setActionError('')
            setApproveWalletId('')
          }
        }}
      >
        <DialogContent className="max-sm:p-4">
          <DialogHeader className="min-w-0 pr-8 text-left">
            <DialogTitle className="break-words text-base leading-snug sm:text-lg">
              {actionType === 'approve' ? 'Одобрить заявку' : 'Отклонить заявку'}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <form onSubmit={handleAction} className="min-w-0 space-y-4">
              <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3 sm:p-4">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="shrink-0 text-muted-foreground">Партнёр</span>
                  <span className="min-w-0 break-words font-medium sm:text-right">
                    {selectedRequest.partner_name}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="shrink-0 text-muted-foreground">Категория</span>
                  <span className="min-w-0 break-words font-medium sm:text-right">
                    {selectedRequest.category_name}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="shrink-0 text-muted-foreground">Сумма</span>
                  <span className="min-w-0 font-medium tabular-nums sm:text-right">
                    {formatCurrency(Number(selectedRequest.amount))}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Номер заказчика</span>
                  <p className="mt-1 break-all font-mono text-sm tabular-nums">
                    {formatCustomerPhoneDisplay(selectedRequest.customer_phone)}
                  </p>
                </div>
                {selectedRequest.address && (
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Адрес</span>
                    <p className="mt-1 break-words">{selectedRequest.address}</p>
                  </div>
                )}
                {selectedRequest.square_meters != null && Number(selectedRequest.square_meters) > 0 && (
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                    <span className="shrink-0 text-muted-foreground">Квадратура</span>
                    <span className="font-medium tabular-nums sm:text-right">
                      {Math.floor(Number(selectedRequest.square_meters))} м²
                    </span>
                  </div>
                )}
                {selectedRequest.work_volume ? (
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Объём в заявке</span>
                    <p className="mt-1 break-words text-sm font-medium">{selectedRequest.work_volume}</p>
                  </div>
                ) : null}
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="min-w-0 text-muted-foreground sm:max-w-[55%]">
                    Предположительный бонус
                  </span>
                  <span className="min-w-0 font-medium tabular-nums sm:text-right">
                    {formatCurrency(
                      estimatePartnerRequestBonus(
                        selectedRequest.square_meters,
                        selectedRequest.category_name ?? null,
                      ),
                    )}
                  </span>
                </div>
                {selectedRequest.work_comment && (
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Комментарий</span>
                    <p className="mt-1 break-words">{selectedRequest.work_comment}</p>
                  </div>
                )}
              </div>

              {actionType === 'approve' && (
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="wallet_id">Списать с кошелька</Label>
                  <input type="hidden" name="wallet_id" value={approveWalletId} readOnly />
                  <Select
                    value={approveWalletId || undefined}
                    onValueChange={setApproveWalletId}
                    required
                  >
                    <SelectTrigger id="wallet_id" className="h-11 w-full min-w-0 max-w-full sm:h-10">
                      <SelectValue placeholder="Выберите кошелёк" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name} ({formatCurrency(Number(w.balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="min-w-0 space-y-2">
                <Label htmlFor="actual_work_volume">Фактический объём работ</Label>
                <Textarea
                  id="actual_work_volume"
                  name="actual_work_volume"
                  placeholder="Например: монтаж по факту, доработки, уточнённый перечень"
                  className="min-h-[80px] w-full min-w-0 max-w-full text-base sm:min-h-[72px] sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Сохранится в заявке и будет виден партнёру в истории.
                </p>
              </div>

              <div className="min-w-0 space-y-2">
                <Label htmlFor="admin_comment">Комментарий к решению</Label>
                <Textarea
                  id="admin_comment"
                  name="admin_comment"
                  placeholder="Комментарий к решению"
                  className="min-h-[88px] w-full min-w-0 max-w-full text-base sm:min-h-[80px] sm:text-sm"
                />
              </div>

              {actionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full min-w-0 sm:h-10 sm:flex-1"
                  onClick={() => {
                    setSelectedRequest(null)
                    setActionType(null)
                    setActionError('')
                    setApproveWalletId('')
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="h-11 w-full min-w-0 sm:h-10 sm:flex-1"
                  variant={actionType === 'approve' ? 'default' : 'destructive'}
                  disabled={loading}
                >
                  {loading ? 'Обработка...' : actionType === 'approve' ? 'Одобрить' : 'Отклонить'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="mb-4 flex flex-col gap-3 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base">
            Ожидают: {pendingCount}
          </Badge>
          <Badge variant="outline" className="border-success/40 bg-success/5 px-3 py-1.5 text-sm text-success">
            Одобрено: {approvedCount}
          </Badge>
          <Badge variant="outline" className="border-destructive/40 bg-destructive/5 px-3 py-1.5 text-sm text-destructive">
            Отклонено: {rejectedCount}
          </Badge>
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              onClick={handleExportCsv}
              disabled={filteredRequests.length === 0}
              aria-label="Экспортировать заявки в CSV"
            >
              <Download className="h-4 w-4 shrink-0" />
              CSV
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Поиск по партнёру, телефону, адресу, объёму…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full pl-9 pr-9 text-base sm:h-10 sm:text-sm"
              aria-label="Поиск по заявкам"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Очистить поиск"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[200px]" aria-label="Месяц">
              <SelectValue placeholder="Месяц" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все месяцы (по группам)</SelectItem>
              {monthOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {transactionMonthTitleRu(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as 'all' | 'pending' | 'approved' | 'rejected')
            }
          >
            <SelectTrigger className="h-11 w-full sm:h-10 sm:w-[200px]" aria-label="Статус">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Только новые</SelectItem>
              <SelectItem value="approved">Одобренные</SelectItem>
              <SelectItem value="rejected">Отклонённые</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Заявки ({filteredRequests.length}
            {filteredRequests.length !== requests.length ? ` из ${requests.length}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-hidden">
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет заявок</p>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-muted-foreground">Ничего не найдено по фильтрам</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setSearch('')
                  setMonthFilter('all')
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-7">
              {groupedByMonth.map(([monthKey, monthRequests]) => {
                const monthTotal = monthRequests.reduce(
                  (s, r) => s + Number(r.amount),
                  0,
                )
                const monthPending = monthRequests.filter((r) => r.status === 'pending').length
                return (
                  <section key={monthKey} className="min-w-0 space-y-3">
                    <header className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3">
                      <h3 className="text-base font-semibold capitalize text-foreground sm:text-lg">
                        {transactionMonthTitleRu(monthKey)}
                      </h3>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
                        <span>
                          Заявок:{' '}
                          <span className="font-medium text-foreground">{monthRequests.length}</span>
                        </span>
                        {monthPending > 0 ? (
                          <span>
                            новых:{' '}
                            <span className="font-medium text-warning">{monthPending}</span>
                          </span>
                        ) : null}
                        <span>
                          сумма:{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatCurrency(monthTotal)}
                          </span>
                        </span>
                      </div>
                    </header>
                    <div className="space-y-3">
                      {monthRequests.map((request) => {
                const config = statusConfig[request.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={request.id}
                    className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-border bg-secondary/30 p-3 sm:flex-row sm:items-stretch sm:justify-between sm:p-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color.split(' ')[0]}`}
                      >
                        <StatusIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 max-w-full break-words font-medium">
                            {request.partner_name}
                          </p>
                          <Badge variant="outline" className={`shrink-0 ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="break-words text-sm text-muted-foreground">
                          {request.category_name}
                        </p>
                        {request.customer_phone ? (
                          <p className="break-all font-mono text-xs tabular-nums text-muted-foreground">
                            {formatCustomerPhoneDisplay(request.customer_phone)}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {request.square_meters != null && Number(request.square_meters) > 0
                            ? `${Math.floor(Number(request.square_meters))} м² · `
                            : ''}
                          бонус ~
                          {formatCurrency(
                            estimatePartnerRequestBonus(
                              request.square_meters,
                              request.category_name ?? null,
                            ),
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 w-full shrink-0 flex-col gap-2 border-t border-border pt-3 sm:w-auto sm:min-w-36 sm:max-w-[min(100%,14rem)] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                      <p className="text-base font-semibold tabular-nums sm:text-right sm:text-lg">
                        {formatCurrency(Number(request.amount))}
                      </p>
                      {request.status === 'pending' && (
                        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
                          <Button
                            size="sm"
                            className="h-11 w-full min-w-0 sm:h-9"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('approve')
                            }}
                          >
                            <Check className="mr-1 h-4 w-4 shrink-0" />
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-11 w-full min-w-0 sm:h-9"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('reject')
                            }}
                          >
                            <X className="mr-1 h-4 w-4 shrink-0" />
                            Отклонить
                          </Button>
                        </div>
                      )}
                      {request.actual_work_volume && (
                        <p className="line-clamp-2 min-w-0 break-words text-sm text-muted-foreground sm:max-w-[200px]">
                          Факт: {request.actual_work_volume}
                        </p>
                      )}
                      {request.admin_comment && (
                        <p className="line-clamp-2 min-w-0 break-words text-sm text-muted-foreground sm:max-w-[200px]">
                          {request.admin_comment}
                        </p>
                      )}
                    </div>
                  </div>
                )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
