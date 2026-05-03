import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LoginForm } from '@/components/login-form'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    if (user.userType === 'admin') {
      redirect('/admin')
    } else {
      redirect('/partner')
    }
  }

  return (
    <main
      className="relative flex min-h-dvh min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-4 py-8 pt-[max(2rem,env(safe-area-inset-top,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))]"
    >
      {/*
        Фоновый брендированный backdrop. Чисто декоративный — задаёт «каркас»
        страницы, чтобы автоскриншоты Vercel и мессенджеров не выглядели
        пустым белым листом, а главная отражала продукт. Лоджин-карточка
        сама несёт логотип и слоган, дублировать заголовок не нужно.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.18),transparent_60%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.18),transparent_60%),linear-gradient(180deg,#0b1020_0%,#0a0f1d_100%)]"
      />

      <LoginForm />
    </main>
  )
}
