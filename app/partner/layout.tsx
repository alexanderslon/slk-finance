import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { PartnerShell } from '@/components/partner-shell'

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
    <PartnerShell partnerName={user.partner_name} username={user.username}>
      {children}
    </PartnerShell>
  )
}
