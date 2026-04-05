'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut } from 'lucide-react'

export function PartnerHeader({
  partnerName,
  username,
}: {
  partnerName: string
  username: string
}) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
      <div
        className="container mx-auto flex min-h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10">
            <Wallet className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">SLK Finance</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{partnerName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <span className="hidden max-w-[7rem] truncate text-xs text-muted-foreground sm:inline sm:max-w-none sm:text-sm">
            {username}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-10 gap-1.5 px-2.5 text-destructive hover:text-destructive sm:h-9 sm:gap-2 sm:px-3"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-sm">Выйти</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
