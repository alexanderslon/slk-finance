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

      if (res.ok) {
        setIsOpen(false)
        setEditWorker(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить работника?')) return

    const res = await fetch(`/api/workers?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setWorkers(workers.filter((w) => w.id !== id))
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditWorker(null)
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
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

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Работники ({workers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Нет работников</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Зарплата</TableHead>
                    <TableHead>Выплачено</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>{worker.position || '-'}</TableCell>
                      <TableCell>{worker.salary ? formatCurrency(Number(worker.salary)) : '-'}</TableCell>
                      <TableCell>{Number(worker.salary_paid) ? formatCurrency(Number(worker.salary_paid)) : '-'}</TableCell>
                      <TableCell>{worker.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(worker.id)}
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
          )}
        </CardContent>
      </Card>
    </>
  )
}
