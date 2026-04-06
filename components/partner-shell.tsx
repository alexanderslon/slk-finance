'use client'

import { PartnerUiProvider } from '@/contexts/partner-ui-context'
import { PartnerHeader } from '@/components/partner-header'
import { PartnerMobileNav } from '@/components/partner-mobile-nav'

export function PartnerShell({
  partnerName,
  username,
  children,
}: {
  partnerName: string
  username: string
  children: React.ReactNode
}) {
  return (
    <PartnerUiProvider>
      <div className="min-h-dvh min-h-[100dvh] bg-background">
        <PartnerHeader partnerName={partnerName} username={username} />
        <main
          className="container mx-auto max-w-3xl px-3 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pt-8 md:pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
        >
          {children}
        </main>
        <PartnerMobileNav />
      </div>
    </PartnerUiProvider>
  )
}
