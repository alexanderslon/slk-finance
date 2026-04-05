'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Target,
  Users,
  Handshake,
  FileText,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

const navItems = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/admin/wallets', label: 'Кошельки', icon: Wallet },
  { href: '/admin/income', label: 'Доходы', icon: ArrowUpCircle },
  { href: '/admin/expenses', label: 'Расходы', icon: ArrowDownCircle },
  { href: '/admin/debts', label: 'Долги', icon: CreditCard },
  { href: '/admin/goals', label: 'Цели', icon: Target },
  { href: '/admin/workers', label: 'Работники', icon: Users },
  { href: '/admin/partners', label: 'Партнеры', icon: Handshake },
  { href: '/admin/requests', label: 'Заявки', icon: FileText },
]

export function AdminSidebar({
  username,
  pendingRequests,
}: {
  username: string
  pendingRequests: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Mobile toggle — safe-area + размер под палец */}
      <Button
        variant="outline"
        size="icon"
        className="fixed z-[60] h-11 w-11 rounded-lg border-border bg-card shadow-sm md:hidden"
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          left: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[56] flex w-[min(18rem,88vw)] flex-col border-r border-border bg-sidebar shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4 sm:h-16 sm:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">SLK Finance</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors md:min-h-0 md:py-2',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.href === '/admin/requests' && pendingRequests > 0 ? (
                  <Badge variant="destructive" className="min-w-5 px-1.5 py-0 text-[10px]">
                    {pendingRequests}
                  </Badge>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div
          className="border-t border-sidebar-border p-3 sm:p-4"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground sm:mb-3 sm:text-sm">
            {username}
          </div>
          <Button
            variant="ghost"
            className="h-11 w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </aside>
    </>
  )
}
