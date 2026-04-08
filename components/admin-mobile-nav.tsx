'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_NAV_ITEMS } from '@/lib/admin-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'

export function AdminMobileNav({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const primary = ADMIN_NAV_ITEMS.filter((i) => i.bottom)
  const secondary = ADMIN_NAV_ITEMS.filter((i) => !i.bottom)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] backdrop-blur-lg md:hidden"
      aria-label="Нижняя навигация админки"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-between gap-0.5 px-1">
        {primary.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground active:bg-muted',
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5 shrink-0" />
                {item.href === '/admin/requests' && pendingRequests > 0 ? (
                  <Badge
                    variant="destructive"
                    className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center p-0 px-0.5 text-[9px]"
                  >
                    {pendingRequests > 9 ? '9+' : pendingRequests}
                  </Badge>
                ) : null}
              </span>
              <span className="line-clamp-1 text-center leading-tight">{item.label}</span>
            </Link>
          )
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex h-auto min-h-[52px] min-w-[52px] flex-1 flex-col gap-0.5 rounded-xl py-1 text-[10px] font-medium text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
              Ещё
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-[env(safe-area-inset-bottom,0px)]">
            <SheetHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 pb-3 text-left">
              <SheetTitle className="min-w-0 flex-1">Разделы</SheetTitle>
              <ThemeToggle variant="outline" />
            </SheetHeader>
            <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-2 py-2">
              {secondary.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                      isActive ? 'bg-primary/15 text-primary' : 'text-foreground active:bg-muted',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-80" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
