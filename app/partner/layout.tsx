import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { PartnerHeader } from '@/components/partner-header'

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user || user.userType !== 'partner') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerHeader partnerName={user.partner_name} username={user.username} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
