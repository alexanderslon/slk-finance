'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { FileText, Check, X, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { PartnerRequest, Wallet } from '@/lib/db'
import { estimatePartnerRequestBonus } from '@/lib/partner-bonus'
import { formatCustomerPhoneDisplay } from '@/lib/phone-format'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
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

  useEffect(() => {
    setRequests(initialRequests)
  }, [initialRequests])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

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

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-4">
        <Badge variant="outline" className="px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-lg">
          Ожидают: {pendingCount}
        </Badge>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Заявки ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-hidden">
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет заявок</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
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
          )}
        </CardContent>
      </Card>
    </>
  )
}
