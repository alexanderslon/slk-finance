import type { LucideIcon } from 'lucide-react'
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
} from 'lucide-react'

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Показывать в нижней панели на мобиле */
  bottom?: boolean
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, bottom: true },
  { href: '/admin/wallets', label: 'Кошельки', icon: Wallet, bottom: true },
  { href: '/admin/income', label: 'Доходы', icon: ArrowUpCircle },
  { href: '/admin/expenses', label: 'Расходы', icon: ArrowDownCircle },
  { href: '/admin/debts', label: 'Долги', icon: CreditCard },
  { href: '/admin/goals', label: 'Цели', icon: Target },
  { href: '/admin/workers', label: 'Работники', icon: Users },
  { href: '/admin/partners', label: 'Партнеры', icon: Handshake },
  { href: '/admin/requests', label: 'Заявки', icon: FileText, bottom: true },
]
