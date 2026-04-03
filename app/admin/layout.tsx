import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin-sidebar'
import { sql } from '@/lib/db'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user || user.userType !== 'admin') {
    redirect('/')
  }

  const pendingRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text as count
    FROM partner_requests
    WHERE status = 'pending'
  `
  const pendingRequests = Number(pendingRows[0]?.count ?? 0)

  return (
    <div className="flex min-h-screen">
      <AdminSidebar username={user.username} pendingRequests={pendingRequests} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
