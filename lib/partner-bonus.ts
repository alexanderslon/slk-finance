/** Базовый бонус за одобренную заявку (не зависит от м²). */
export const PARTNER_BONUS_BASE_RUB = 1000

/** Доплата за каждый целый м² (если квадратура указана). */
export const PARTNER_BONUS_PER_SQM_RUB = 1000

/**
 * Предположительный бонус: 1000 ₽ за заявку + 1000 ₽ × м² (целые м²).
 * Без квадратуры — только базовые 1000 ₽.
 */
export function estimatePartnerRequestBonus(squareMeters: number | string | null | undefined): number {
  const base = PARTNER_BONUS_BASE_RUB
  if (squareMeters == null || squareMeters === '') return base
  const n = Number(squareMeters)
  if (!Number.isFinite(n) || n <= 0) return base
  const sq = Math.floor(n)
  return base + sq * PARTNER_BONUS_PER_SQM_RUB
}

/** Варианты м² для формы (целые числа). */
export const PARTNER_SQM_SELECT_OPTIONS: number[] = [
  1, 2, 3, 4,
  ...Array.from({ length: 20 }, (_, i) => 5 * (i + 1)),
  120, 150, 200,
]
