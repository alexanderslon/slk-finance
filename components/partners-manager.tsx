'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, Handshake, UserPlus } from 'lucide-react'
import type { Partner, PartnerUser } from '@/lib/db'

export function PartnersManager({
  initialPartners,
  initialPartnerUsers,
}: {
  initialPartners: Partner[]
  initialPartnerUsers: PartnerUser[]
}) {
  const router = useRouter()
  const [partners, setPartners] = useState(initialPartners)
  const [partnerUsers, setPartnerUsers] = useState(initialPartnerUsers)
  const [isPartnerOpen, setIsPartnerOpen] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [editPartner, setEditPartner] = useState<Partner | null>(null)
  const [editUser, setEditUser] = useState<PartnerUser | null>(null)
  const [loading, setLoading] = useState(false)
  const { confirm, dialog } = useConfirmDialog()

  useEffect(() => {
    setPartners(initialPartners)
  }, [initialPartners])

  useEffect(() => {
    setPartnerUsers(initialPartnerUsers)
  }, [initialPartnerUsers])

  async function handlePartnerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
    }

    try {
      const res = await fetch('/api/partners', {
        method: editPartner ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPartner ? { ...data, id: editPartner.id } : data),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось сохранить партнёра')
        return
      }
      toast.success(editPartner ? 'Партнёр обновлён' : 'Партнёр добавлен')
      setIsPartnerOpen(false)
      setEditPartner(null)
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  async function handleUserSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      partner_id: Number(formData.get('partner_id')),
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    }

    try {
      const res = await fetch('/api/partner-users', {
        method: editUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser ? { ...data, id: editUser.id } : data),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось сохранить аккаунт')
        return
      }
      toast.success(editUser ? 'Аккаунт обновлён' : 'Аккаунт создан')
      setIsUserOpen(false)
      setEditUser(null)
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  async function handlePartnerDelete(id: number, name?: string) {
    const ok = await confirm({
      title: 'Удалить партнёра?',
      description: name
        ? `«${name}» и все его аккаунты будут удалены безвозвратно.`
        : 'Все связанные аккаунты также будут удалены.',
      confirmLabel: 'Удалить',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/partners?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(err.error || 'Не удалось удалить партнёра')
        return
      }
      toast.success('Партнёр удалён')
      setPartners((prev) => prev.filter((p) => p.id !== id))
      setPartnerUsers((prev) => prev.filter((u) => u.partner_id !== id))
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    }
  }

  async function handleUserDelete(id: number, username?: string) {
    const ok = await confirm({
      title: 'Удалить аккаунт партнёра?',
      description: username ? `Логин «${username}» больше не сможет войти.` : undefined,
      confirmLabel: 'Удалить',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/partner-users?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Не удалось удалить аккаунт')
        return
      }
      toast.success('Аккаунт удалён')
      setPartnerUsers((prev) => prev.filter((u) => u.id !== id))
      router.refresh()
    } catch {
      toast.error('Ошибка сети')
    }
  }

  async function handleToggleActive(user: PartnerUser) {
    try {
      const res = await fetch('/api/partner-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
      })

      if (!res.ok) {
        toast.error('Не удалось переключить статус')
        return
      }
      setPartnerUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)),
      )
      toast.success(user.is_active ? 'Аккаунт заблокирован' : 'Аккаунт активирован')
    } catch {
      toast.error('Ошибка сети')
    }
  }

  return (
    <Tabs defaultValue="partners" className="space-y-6">
      <TabsList className="w-full">
        <TabsTrigger value="partners" className="flex-1">
          Партнёры
        </TabsTrigger>
        <TabsTrigger value="accounts" className="flex-1">
          Аккаунты
        </TabsTrigger>
      </TabsList>

      <TabsContent value="partners" className="space-y-4">
        <div className="flex justify-stretch sm:justify-end">
          <Dialog open={isPartnerOpen} onOpenChange={(open) => {
            setIsPartnerOpen(open)
            if (!open) setEditPartner(null)
          }}>
            <DialogTrigger asChild>
              <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto">
                <Plus className="h-4 w-4 shrink-0" />
                Добавить партнёра
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editPartner ? 'Редактировать партнёра' : 'Новый партнёр'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePartnerSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Название партнёра"
                    defaultValue={editPartner?.name}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="+7 (999) 123-45-67"
                    defaultValue={editPartner?.phone || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    defaultValue={editPartner?.email || ''}
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
              <Handshake className="h-5 w-5" />
              Партнёры ({partners.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет партнёров</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {partners.map((partner) => {
                    const userCount = partnerUsers.filter((u) => u.partner_id === partner.id).length
                    return (
                      <div
                        key={partner.id}
                        className="rounded-xl border border-border bg-secondary/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">{partner.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{partner.phone || '—'}</p>
                            {partner.email ? (
                              <p className="mt-0.5 break-all text-sm text-muted-foreground">{partner.email}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditPartner(partner)
                                setIsPartnerOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handlePartnerDelete(partner.id, partner.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                          <span className="text-sm text-muted-foreground">Аккаунты</span>
                          <Badge variant="outline">{userCount}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Аккаунты</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map((partner) => {
                        const userCount = partnerUsers.filter((u) => u.partner_id === partner.id).length
                        return (
                          <TableRow key={partner.id}>
                            <TableCell className="font-medium">{partner.name}</TableCell>
                            <TableCell>{partner.phone || '-'}</TableCell>
                            <TableCell>{partner.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{userCount}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditPartner(partner)
                                    setIsPartnerOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handlePartnerDelete(partner.id, partner.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="accounts" className="space-y-4">
        <div className="flex justify-stretch sm:justify-end">
          <Dialog open={isUserOpen} onOpenChange={(open) => {
            setIsUserOpen(open)
            if (!open) setEditUser(null)
          }}>
            <DialogTrigger asChild>
              <Button className="h-11 w-full gap-2 sm:h-10 sm:w-auto">
                <UserPlus className="h-4 w-4 shrink-0" />
                Создать аккаунт
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editUser ? 'Редактировать аккаунт' : 'Новый аккаунт'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="partner_id">Партнёр</Label>
                  <Select name="partner_id" defaultValue={editUser?.partner_id?.toString()} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите партнёра" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Логин</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="Логин для входа"
                    defaultValue={editUser?.username}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Пароль"
                    required={!editUser}
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
              <UserPlus className="h-5 w-5" />
              Аккаунты партнёров ({partnerUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partnerUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет аккаунтов</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {partnerUsers.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-xl border border-border bg-secondary/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono font-semibold tabular-nums">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.partner_name}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditUser(user)
                              setIsUserOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleUserDelete(user.id, user.username)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Активен' : 'Заблокирован'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Вкл.</span>
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() => handleToggleActive(user)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Логин</TableHead>
                        <TableHead>Партнёр</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Активен</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partnerUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.partner_name}</TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? 'Активен' : 'Заблокирован'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={() => handleToggleActive(user)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditUser(user)
                                  setIsUserOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleUserDelete(user.id, user.username)}
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
      </TabsContent>
      {dialog}
    </Tabs>
  )
}
