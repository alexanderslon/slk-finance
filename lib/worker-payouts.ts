/** Категории расходов, считающиеся выплатами работнику. */
export const WORKER_PAYOUT_CATEGORY_NAMES = [
  'ЗП',
  'Аванс',
  'Премия',
  'Зарплата работникам',
  'Аванс работникам',
  'Премия работникам',
] as const

/** Фрагмент SQL для `c.name IN (...)`. */
export const WORKER_PAYOUT_CATEGORY_SQL_IN =
  "('ЗП','Аванс','Премия','Зарплата работникам','Аванс работникам','Премия работникам')"

export type WorkerPayoutKind = 'advance' | 'salary' | 'bonus' | 'other'

export type WorkerPayoutTx = {
  id: number
  amount: number
  created_at: string | Date
  description: string | null
  category_name: string | null
  wallet_name: string | null
}

export function workerPayoutKind(name: string | null): WorkerPayoutKind {
  if (!name) return 'other'
  if (name === 'Аванс' || name === 'Аванс работникам') return 'advance'
  if (name === 'Премия' || name === 'Премия работникам') return 'bonus'
  if (name === 'ЗП' || name === 'Зарплата работникам') return 'salary'
  return 'other'
}

export function workerPayoutKindLabel(kind: WorkerPayoutKind): string {
  switch (kind) {
    case 'advance':
      return 'Аванс'
    case 'salary':
      return 'Зарплата'
    case 'bonus':
      return 'Премия'
    default:
      return 'Прочее'
  }
}

export type WorkerPayoutTotals = {
  advance: number
  salary: number
  bonus: number
  other: number
  total: number
}

export function totalsFromWorkerPayouts(rows: WorkerPayoutTx[]): WorkerPayoutTotals {
  return rows.reduce(
    (acc, r) => {
      const k = workerPayoutKind(r.category_name)
      const amt = Number(r.amount) || 0
      acc.total += amt
      if (k === 'advance') acc.advance += amt
      if (k === 'salary') acc.salary += amt
      if (k === 'bonus') acc.bonus += amt
      if (k === 'other') acc.other += amt
      return acc
    },
    { advance: 0, salary: 0, bonus: 0, other: 0, total: 0 },
  )
}
