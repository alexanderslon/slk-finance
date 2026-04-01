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
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">SLK Finance</h1>
            <p className="text-sm text-muted-foreground">{partnerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>
    </header>
  )
}
