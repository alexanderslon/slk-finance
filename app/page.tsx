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
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </main>
  )
}
