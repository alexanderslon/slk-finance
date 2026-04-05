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
      className="flex min-h-dvh min-h-[100dvh] w-full flex-col items-center justify-center px-4 py-8 pt-[max(2rem,env(safe-area-inset-top,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))]"
    >
      <LoginForm />
    </main>
  )
}
