import { PINNED_WALLET_NAMES_BOTTOM } from '@/lib/wallet-order'

const pinnedExact = new Set(PINNED_WALLET_NAMES_BOTTOM.map((n) => n.trim().toLowerCase()))

/** Кошельки «резерва» по умолчанию не входят в общий баланс на дашборде. */
export function isWalletExcludedFromDashboardTotal(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (pinnedExact.has(n)) return true
  if (n.includes('развитие')) return true
  if (n.includes('благотвор')) return true
  if (n.includes('на будущее')) return true
  return false
}

/** Сумма балансов для карточки «Общий баланс». */
export function sumWalletsForDashboardTotal(
  wallets: readonly { name: string; balance: number | string }[],
): number {
  return wallets.reduce((sum, w) => {
    if (isWalletExcludedFromDashboardTotal(w.name)) return sum
    return sum + Number(w.balance)
  }, 0)
}
