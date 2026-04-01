'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

      if (res.ok) {
        setIsPartnerOpen(false)
        setEditPartner(null)
        router.refresh()
      }
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

      if (res.ok) {
        setIsUserOpen(false)
        setEditUser(null)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePartnerDelete(id: number) {
    if (!confirm('Удалить партнера? Все связанные аккаунты также будут удалены.')) return

    const res = await fetch(`/api/partners?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPartners(partners.filter((p) => p.id !== id))
      setPartnerUsers(partnerUsers.filter((u) => u.partner_id !== id))
      router.refresh()
    }
  }

  async function handleUserDelete(id: number) {
    if (!confirm('Удалить аккаунт партнера?')) return

    const res = await fetch(`/api/partner-users?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPartnerUsers(partnerUsers.filter((u) => u.id !== id))
      router.refresh()
    }
  }

  async function handleToggleActive(user: PartnerUser) {
    const res = await fetch('/api/partner-users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    })

    if (res.ok) {
      setPartnerUsers(partnerUsers.map((u) => 
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      ))
    }
  }

  return (
    <Tabs defaultValue="partners" className="space-y-6">
      <TabsList>
        <TabsTrigger value="partners">Партнеры</TabsTrigger>
        <TabsTrigger value="accounts">Аккаунты</TabsTrigger>
      </TabsList>

      <TabsContent value="partners" className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={isPartnerOpen} onOpenChange={(open) => {
            setIsPartnerOpen(open)
            if (!open) setEditPartner(null)
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить партнера
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editPartner ? 'Редактировать партнера' : 'Новый партнер'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePartnerSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Название партнера"
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
              Партнеры ({partners.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет партнеров</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
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
                                className="h-8 w-8"
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
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handlePartnerDelete(partner.id)}
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
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="accounts" className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={isUserOpen} onOpenChange={(open) => {
            setIsUserOpen(open)
            if (!open) setEditUser(null)
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Создать аккаунт
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editUser ? 'Редактировать аккаунт' : 'Новый аккаунт'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="partner_id">Партнер</Label>
                  <Select name="partner_id" defaultValue={editUser?.partner_id?.toString()} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите партнера" />
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
              Аккаунты партнеров ({partnerUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partnerUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет аккаунтов</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Логин</TableHead>
                      <TableHead>Партнер</TableHead>
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
                              className="h-8 w-8"
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
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleUserDelete(user.id)}
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
      </TabsContent>
    </Tabs>
  )
}
