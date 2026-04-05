import { timingSafeEqual } from 'node:crypto'

/** Сравнение секретов без утечки по времени (длины должны совпадать). */
export function secureCompareString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
