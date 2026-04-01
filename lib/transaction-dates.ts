import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

/**
 * Ключ месяца для группировки: одинаково на сервере и в браузере (без сдвига TZ).
 * Берём календарную дату из ISO-строки Postgres / JSON.
 */
export function transactionMonthKey(created_at: string | Date): string {
  if (typeof created_at === 'string') {
    const m = created_at.match(/^(\d{4})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}`
  }
  const d = new Date(created_at)
  if (Number.isNaN(d.getTime())) {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function transactionMonthTitleRu(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number)
  if (!y || !m) return yyyyMm
  return format(new Date(y, m - 1, 1), 'LLLL yyyy', { locale: ru })
}

/** Дата операции для таблицы — из календарной части ISO, без расхождений при гидратации. */
export function formatTransactionDateRu(created_at: string | Date): string {
  if (typeof created_at === 'string') {
    const m = created_at.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2])
      const day = Number(m[3])
      return format(new Date(y, mo - 1, day), 'd MMM yyyy', { locale: ru })
    }
  }
  const d = new Date(created_at)
  const y = d.getUTCFullYear()
  const mo = d.getUTCMonth()
  const day = d.getUTCDate()
  return format(new Date(y, mo, day), 'd MMM yyyy', { locale: ru })
}

function ymMax(a: string, b: string): string {
  return a >= b ? a : b
}

function ymMin(a: string, b: string): string {
  return a <= b ? a : b
}

/** Сдвиг yyyy-mm на delta месяцев (может быть отрицательным). */
export function addMonthsYm(ym: string, delta: number): string {
  let y = Number(ym.slice(0, 4))
  let m = Number(ym.slice(5, 7))
  m += delta
  while (m > 12) {
    m -= 12
    y++
  }
  while (m < 1) {
    m += 12
    y--
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

/** Список yyyy-mm от max до min включительно (max первый). */
export function monthKeysRangeDescending(minYm: string, maxYm: string): string[] {
  if (minYm > maxYm) return []
  const out: string[] = []
  let cur = maxYm
  while (true) {
    out.push(cur)
    if (cur === minYm) break
    cur = addMonthsYm(cur, -1)
  }
  return out
}

/**
 * Селект месяцев: до ~36 месяцев назад от «конца» + все месяцы, где есть операции.
 */
export function buildMonthSelectOptions(transactions: { created_at: string | Date }[]): string[] {
  const txKeys = transactions.map((t) => transactionMonthKey(t.created_at))
  const latestTx = txKeys.length ? txKeys.reduce(ymMax) : null
  const earliestTx = txKeys.length ? txKeys.reduce(ymMin) : null

  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const endKey = latestTx ? ymMax(todayKey, latestTx) : todayKey

  const windowStart = addMonthsYm(endKey, -35)
  const startKey = earliestTx ? ymMin(earliestTx, windowStart) : windowStart

  return monthKeysRangeDescending(startKey, endKey)
}

/** То же по границам из БД (min/max месяц операций). */
export function buildMonthSelectOptionsFromBounds(
  minYm: string | null,
  maxYm: string | null,
): string[] {
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const endKey = maxYm ? ymMax(todayKey, maxYm) : todayKey
  const windowStart = addMonthsYm(endKey, -35)
  const startKey = minYm ? ymMin(minYm, windowStart) : windowStart
  return monthKeysRangeDescending(startKey, endKey)
}

