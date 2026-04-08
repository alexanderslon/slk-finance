'use client'

import { usePartnerUi } from '@/contexts/partner-ui-context'
import { Button } from '@/components/ui/button'
import { Home, Plus, List } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export function PartnerMobileNav() {
  const { openGenericNewRequest } = usePartnerUi()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur-lg md:hidden"
      aria-label="Нижняя навигация"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2">
        <Button
          type="button"
          variant="ghost"
          className="flex h-14 min-h-[56px] flex-1 flex-col gap-0.5 rounded-xl py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <Home className="h-5 w-5" />
          Главная
        </Button>
        <Button
          type="button"
          variant="default"
          className="flex h-14 min-h-[56px] flex-1 flex-col gap-0.5 rounded-xl bg-primary py-1 text-xs font-semibold shadow-md"
          onClick={() => openGenericNewRequest()}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
          Заявка
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex h-14 min-h-[56px] flex-1 flex-col gap-0.5 rounded-xl py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => {
            document.getElementById('partner-requests-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          <List className="h-5 w-5" />
          Список
        </Button>

        <ThemeToggle variant="outline" />
      </div>
    </nav>
  )
}
