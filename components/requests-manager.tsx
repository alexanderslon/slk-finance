'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  async function handleAction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedRequest || !actionType) return
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      id: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      admin_comment: formData.get('admin_comment') as string || null,
      wallet_id: actionType === 'approve' ? Number(formData.get('wallet_id')) : null,
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setSelectedRequest(null)
        setActionType(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null)
          setActionType(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Одобрить заявку' : 'Отклонить заявку'}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <form onSubmit={handleAction} className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Партнер:</span>
                  <span className="font-medium">{selectedRequest.partner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Категория:</span>
                  <span className="font-medium">{selectedRequest.category_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Сумма:</span>
                  <span className="font-medium">{formatCurrency(Number(selectedRequest.amount))}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Номер заказчика:</span>
                  <p className="mt-1 font-mono tabular-nums">
                    {formatCustomerPhoneDisplay(selectedRequest.customer_phone)}
                  </p>
                </div>
                {selectedRequest.address && (
                  <div>
                    <span className="text-muted-foreground">Адрес:</span>
                    <p className="mt-1">{selectedRequest.address}</p>
                  </div>
                )}
                {selectedRequest.square_meters != null && Number(selectedRequest.square_meters) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Квадратура:</span>
                    <span className="font-medium">{Math.floor(Number(selectedRequest.square_meters))} м²</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Предположительный бонус:</span>
                  <span className="font-medium">
                    {formatCurrency(estimatePartnerRequestBonus(selectedRequest.square_meters))}
                  </span>
                </div>
                {selectedRequest.work_comment && (
                  <div>
                    <span className="text-muted-foreground">Комментарий:</span>
                    <p className="mt-1">{selectedRequest.work_comment}</p>
                  </div>
                )}
              </div>

              {actionType === 'approve' && (
                <div className="space-y-2">
                  <Label htmlFor="wallet_id">Списать с кошелька</Label>
                  <Select name="wallet_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите кошелек" />
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

              <div className="space-y-2">
                <Label htmlFor="admin_comment">Комментарий</Label>
                <Textarea
                  id="admin_comment"
                  name="admin_comment"
                  placeholder="Комментарий к решению"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedRequest(null)
                    setActionType(null)
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
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

      <div className="flex items-center gap-4 mb-6">
        <Badge variant="outline" className="text-lg px-4 py-2">
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
        <CardContent>
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
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color.split(' ')[0]}`}>
                        <StatusIcon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{request.partner_name}</p>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.category_name}
                          {request.customer_phone &&
                            ` · ${formatCustomerPhoneDisplay(request.customer_phone)}`}
                          {request.square_meters != null && Number(request.square_meters) > 0
                            ? ` · ${Math.floor(Number(request.square_meters))} м²`
                            : ''}
                          {' · '}
                          бонус ~{formatCurrency(estimatePartnerRequestBonus(request.square_meters))}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(request.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(request.amount))}
                      </p>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('approve')
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Одобрить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('reject')
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      )}
                      {request.admin_comment && (
                        <p className="text-sm text-muted-foreground max-w-[200px] truncate">
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
