'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import type { Worker } from '@/lib/db'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function WorkersManager({ initialWorkers }: { initialWorkers: Worker[] }) {
  const router = useRouter()
  const [workers, setWorkers] = useState(initialWorkers)
  const [isOpen, setIsOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  useEffect(() => {
    setWorkers(initialWorkers)
  }, [initialWorkers])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      position: formData.get('position') as string || null,
      salary: formData.get('salary') ? Number(formData.get('salary')) : null,
      phone: formData.get('phone') as string || null,
    }

    try {
      const res = await fetch('/api/workers', {
        method: editWorker ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editWorker ? { ...data, id: editWorker.id } : data),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось сохранить работника')
        return
      }
      toast.success(editWorker ? 'Работник обновлён' : 'Работник добавлен')
      setIsOpen(false)
      setEditWorker(null)
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number, name?: string) {
    const ok = await confirm({
      title: 'Удалить работника?',
      description: name
        ? `«${name}» будет удалён вместе с историей выплат.`
        : 'Действие нельзя отменить.',
      confirmLabel: 'Удалить',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/workers?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Не удалось удалить работника')
        return
      }
      toast.success('Работник удалён')
      setWorkers((prev) => prev.filter((w) => w.id !== id))
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    }
  }

  return (
    <>
      <div className="flex justify-stretch sm:justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditWorker(null)
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto">
              <Plus className="h-4 w-4 shrink-0" />
              Добавить работника
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editWorker ? 'Редактировать работника' : 'Новый работник'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="ФИО работника"
                  defaultValue={editWorker?.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Должность</Label>
                <Input
                  id="position"
                  name="position"
                  placeholder="Должность"
                  defaultValue={editWorker?.position || ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Зарплата</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  defaultValue={editWorker?.salary || ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+7 (999) 123-45-67"
                  defaultValue={editWorker?.phone || ''}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-3xl border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Работники ({workers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {workers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет работников</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className="rounded-2xl border border-border bg-secondary/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/workers/${worker.id}`}
                          className="line-clamp-2 font-semibold leading-snug hover:underline"
                          title="История выплат работнику"
                        >
                          {worker.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{worker.position || '—'}</p>
                        {worker.phone ? (
                          <p className="mt-1 font-mono text-sm tabular-nums">{worker.phone}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditWorker(worker)
                            setIsOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(worker.id, worker.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Зарплата</p>
                        <p className="font-medium tabular-nums">
                          {worker.salary ? formatCurrency(Number(worker.salary)) : '—'}
                        </p>
                      </div>
                      <div>
                      <p className="text-muted-foreground">Выплачено (итого)</p>
                        <p className="font-medium tabular-nums">
                        {Number(worker.paid_total ?? worker.salary_paid) ? formatCurrency(Number(worker.paid_total ?? worker.salary_paid)) : '—'}
                        </p>
                      </div>
                    </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Аванс</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(worker.paid_advance ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ЗП</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(worker.paid_salary ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Премия</p>
                      <p className="font-medium tabular-nums">
                        {formatCurrency(Number(worker.paid_bonus ?? 0))}
                      </p>
                    </div>
                  </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Должность</TableHead>
                      <TableHead>Зарплата</TableHead>
                      <TableHead>Аванс</TableHead>
                      <TableHead>ЗП</TableHead>
                      <TableHead>Премия</TableHead>
                      <TableHead>Выплачено (итого)</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/workers/${worker.id}`}
                            className="hover:underline"
                            title="История выплат работнику"
                          >
                            {worker.name}
                          </Link>
                        </TableCell>
                        <TableCell>{worker.position || '-'}</TableCell>
                        <TableCell>{worker.salary ? formatCurrency(Number(worker.salary)) : '-'}</TableCell>
                        <TableCell>
                          {formatCurrency(Number(worker.paid_advance ?? 0))}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(worker.paid_salary ?? 0))}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(worker.paid_bonus ?? 0))}
                        </TableCell>
                        <TableCell>
                          {Number(worker.paid_total ?? worker.salary_paid) ? formatCurrency(Number(worker.paid_total ?? worker.salary_paid)) : '-'}
                        </TableCell>
                        <TableCell>{worker.phone || '-'}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditWorker(worker)
                                setIsOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(worker.id, worker.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {dialog}
    </>
  )
}
