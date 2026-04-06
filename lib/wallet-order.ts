import type { Wallet } from '@/lib/db'

/**
 * Три «резервных» кошелька всегда внизу списка, в таком порядке (сверху вниз в блоке):
 * благотворительность → развитие → будущее (последний в списке — «На будущее»).
 */
export const PINNED_WALLET_NAMES_BOTTOM = [
  'Благотворительность',
  'На развитие',
  'На будущее',
] as const

export function sortWalletsWithPinnedBottom(wallets: Wallet[]): Wallet[] {
  const orderIndex = new Map<string, number>(
    PINNED_WALLET_NAMES_BOTTOM.map((name, i) => [name.trim().toLowerCase(), i]),
  )
  const rest: Wallet[] = []
  const pinned: { wallet: Wallet; idx: number }[] = []
  for (const w of wallets) {
    const key = w.name.trim().toLowerCase()
    const idx = orderIndex.get(key)
    if (idx !== undefined) pinned.push({ wallet: w, idx })
    else rest.push(w)
  }
  pinned.sort((a, b) => a.idx - b.idx)
  return [...rest, ...pinned.map((p) => p.wallet)]
}
