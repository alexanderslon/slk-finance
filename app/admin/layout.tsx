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

  const pendingRows = (await sql`
    SELECT COUNT(*)::text as count
    FROM partner_requests
    WHERE status = 'pending'
  `) as { count: string }[]
  const pendingRequests = Number(pendingRows[0]?.count ?? 0)

  return (
    <div className="flex min-h-dvh min-h-[100dvh] bg-background">
      <AdminSidebar username={user.username} pendingRequests={pendingRequests} />
      <main className="flex min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-14 sm:px-5 sm:py-5 md:px-6 md:py-6 md:pt-6">
        {children}
      </main>
    </div>
  )
}
