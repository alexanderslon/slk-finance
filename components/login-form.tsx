'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RuPhoneField } from '@/components/ru-phone-field'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/branding'
import { RU_PHONE_FIELD_PREFIX, ruPhoneDigits } from '@/lib/phone-format'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Wallet, Users, UserPlus, ShieldCheck } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [partnerPhone, setPartnerPhone] = useState(RU_PHONE_FIELD_PREFIX)
  const [regPhone, setRegPhone] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false)
  const [loginRole, setLoginRole] = useState<'admin' | 'partner'>('admin')

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

      const data = await res.json().catch(() => ({}))

      // Раньше при `!res.ok` без поля `error` форма всё равно редиректила —
      // пользователь попадал в защищённый раздел и тут же выкидывался обратно.
      if (!res.ok || data.error) {
        setError(typeof data.error === 'string' ? data.error : 'Не удалось войти')
        return
      }

      router.push(type === 'admin' ? '/admin' : '/partner')
      router.refresh()
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
    const passwordConfirm = formData.get('password_confirm') as string

    if (password !== passwordConfirm) {
      setLoading(false)
      setError('Пароли не совпадают')
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.error) {
        setError(typeof data.error === 'string' ? data.error : 'Не удалось зарегистрироваться')
        return
      }

      setSuccess('Регистрация успешна! Ожидайте одобрения админа.')
      setShowRegister(false)
    } catch {
      setError('Ошибка сервера')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-lg rounded-3xl border-border bg-card shadow-xl">
      <CardHeader className="space-y-3 px-5 pb-2 pt-8 text-center sm:space-y-4 sm:px-8 sm:pt-10">
        <div className="mx-auto mb-1 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg sm:mb-2 sm:h-24 sm:w-24">
          <Wallet className="h-10 w-10 text-primary-foreground sm:h-11 sm:w-11" />
        </div>
        <CardTitle className="text-4xl font-bold tracking-tight sm:text-5xl">{SITE_NAME}</CardTitle>
        <CardDescription className="text-lg text-muted-foreground sm:text-xl sm:leading-snug">
          {SITE_TAGLINE}
        </CardDescription>
        <p className="mx-auto max-w-md pt-1 text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
          Мы соединяем тех, кто ищет работу или услуги, с теми, кто может их качественно выполнить.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-8 sm:px-8">
        {showRegister ? (
          <div className="flex flex-col gap-4 rounded-3xl border border-border bg-secondary/25 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold sm:text-xl">Регистрация партнёра</h3>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10 shrink-0"
                onClick={() => {
                  setShowRegister(false)
                  setRegPhone('')
                  setShowRegPassword(false)
                  setShowRegPasswordConfirm(false)
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
                <div className="relative">
                  <Input
                    id="reg-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Придумайте пароль"
                    required
                    minLength={4}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowRegPassword((v) => !v)}
                    aria-label={showRegPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Проверьте, что пароль введён правильно. Его нельзя восстановить — только сбросить.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-password-confirm">Повторите пароль</Label>
                <div className="relative">
                  <Input
                    id="reg-password-confirm"
                    name="password_confirm"
                    type={showRegPasswordConfirm ? 'text' : 'password'}
                    placeholder="Повторите пароль"
                    required
                    minLength={4}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowRegPasswordConfirm((v) => !v)}
                    aria-label={showRegPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showRegPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}
              <Button type="submit" className="h-12 w-full text-base font-semibold sm:h-11" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="w-full space-y-6 sm:space-y-8">
            <div>
              <p className="mb-3 text-center text-sm text-muted-foreground sm:mb-4 sm:text-base">
                Как вы заходите?
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('admin')
                    setError('')
                  }}
                  className={cn(
                    'order-2 flex min-h-19 flex-row items-center gap-3 rounded-3xl border-2 p-4 text-left transition-all sm:order-1 sm:min-h-0 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:p-6 sm:text-center',
                    loginRole === 'admin'
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                      : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14',
                      loginRole === 'admin'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-primary',
                    )}
                  >
                    <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-none">
                    <span className="block text-lg font-semibold leading-tight sm:text-xl">Админ</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Учёт, кошельки, заявки
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('partner')
                    setError('')
                    setPartnerPhone((p) =>
                      ruPhoneDigits(p).length === 0 ? RU_PHONE_FIELD_PREFIX : p,
                    )
                  }}
                  className={cn(
                    'order-1 flex min-h-19 flex-row items-center gap-3 rounded-3xl border-2 p-4 text-left transition-all sm:order-2 sm:min-h-0 sm:flex-col sm:items-center sm:justify-center sm:gap-3 sm:p-6 sm:text-center',
                    loginRole === 'partner'
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                      : 'border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14',
                      loginRole === 'partner'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-primary',
                    )}
                  >
                    <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-none">
                    <span className="block text-lg font-semibold leading-tight sm:text-xl">Партнёр</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Бонусы и заявки
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {loginRole === 'admin' ? (
              <form
                onSubmit={(e) => handleSubmit(e, 'admin')}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-secondary/25 p-5 sm:gap-5 sm:p-6"
              >
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
                <Button type="submit" className="h-12 w-full text-base font-semibold sm:h-11" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти как админ'}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={(e) => handleSubmit(e, 'partner')}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-secondary/25 p-5 sm:gap-5 sm:p-6"
              >
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
                <Button type="submit" className="h-12 w-full text-base font-semibold sm:h-11" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти как партнёр'}
                </Button>
                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-secondary/25 px-2 text-muted-foreground">или</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full text-base sm:h-11"
                  onClick={() => setShowRegister(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                  Стать партнёром
                </Button>
              </form>
            )}

            {loginRole === 'admin' ? (
              <p className="text-center text-sm text-muted-foreground">
                Нужен вход как партнёр? Переключитесь на «Партнёр» — там же регистрация.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
