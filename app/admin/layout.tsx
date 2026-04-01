import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user || user.userType !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar username={user.username} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
