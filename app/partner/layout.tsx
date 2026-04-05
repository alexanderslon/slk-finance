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
    <div className="min-h-dvh min-h-[100dvh] bg-background">
      <PartnerHeader partnerName={user.partner_name} username={user.username} />
      <main
        className="container mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>
    </div>
  )
}
