'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RuPhoneField } from '@/components/ru-phone-field'
import { Wallet, Users, UserPlus } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [partnerPhone, setPartnerPhone] = useState('')
  const [regPhone, setRegPhone] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, type: 'admin' | 'partner') {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, type }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        router.push(type === 'admin' ? '/admin' : '/partner')
        router.refresh()
      }
    } catch {
      setError('Ошибка сервера')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess('Регистрация успешна! Ожидайте одобрения администратора.')
        setShowRegister(false)
      }
    } catch {
      setError('Ошибка сервера')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-lg">
      <CardHeader className="space-y-2 px-4 pb-2 pt-6 text-center sm:px-6">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary sm:mb-4 sm:h-16 sm:w-16">
          <Wallet className="h-7 w-7 text-primary-foreground sm:h-8 sm:w-8" />
        </div>
        <CardTitle className="text-xl font-bold sm:text-2xl">SLK Finance</CardTitle>
        <CardDescription className="text-sm sm:text-base">Система учета доходов и расходов</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-6">
        {showRegister ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold sm:text-lg">Регистрация партнера</h3>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10 shrink-0"
                onClick={() => {
                  setShowRegister(false)
                  setRegPhone('')
                }}
              >
                Назад
              </Button>
            </div>
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-name">Имя</Label>
                <Input
                  id="reg-name"
                  name="name"
                  placeholder="Ваше имя"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-phone">Телефон (будет логином)</Label>
                <RuPhoneField
                  id="reg-phone"
                  name="phone"
                  value={regPhone}
                  onChange={setRegPhone}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-password">Пароль</Label>
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  placeholder="Придумайте пароль"
                  required
                  minLength={4}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>
            </form>
          </div>
        ) : (
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" className="gap-2">
                <Wallet className="h-4 w-4" />
                Админ
              </TabsTrigger>
              <TabsTrigger value="partner" className="gap-2">
                <Users className="h-4 w-4" />
                Партнер
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="mt-4 sm:mt-6">
              <form onSubmit={(e) => handleSubmit(e, 'admin')} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="admin-username">Логин</Label>
                  <Input
                    id="admin-username"
                    name="username"
                    placeholder="Введите логин"
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="admin-password">Пароль</Label>
                  <Input
                    id="admin-password"
                    name="password"
                    type="password"
                    placeholder="Введите пароль"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-primary">{success}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="partner" className="mt-4 sm:mt-6">
              <form onSubmit={(e) => handleSubmit(e, 'partner')} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="partner-username">Телефон</Label>
                  <RuPhoneField
                    id="partner-username"
                    name="username"
                    value={partnerPhone}
                    onChange={setPartnerPhone}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="partner-password">Пароль</Label>
                  <Input
                    id="partner-password"
                    name="password"
                    type="password"
                    placeholder="Введите пароль"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-primary">{success}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </Button>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">или</span>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => setShowRegister(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Зарегистрироваться
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
