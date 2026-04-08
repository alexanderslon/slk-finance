/** Базовый бонус за одобренную заявку (не зависит от м²). */
export const PARTNER_BONUS_BASE_RUB = 1000

/** Фиксированный бонус для отдельных категорий (без доплаты за м²). */
export const PARTNER_BONUS_REDUCED_BASE_RUB = 500

const REDUCED_BONUS_CATEGORY_NAMES = new Set([
  'Смеситель',
  'Унитаз',
  /** Ранее созданные заявки в БД */
  'Установка смесителя',
  'Установка унитаза',
])

export function isReducedPartnerBonusCategory(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false
  return REDUCED_BONUS_CATEGORY_NAMES.has(categoryName.trim())
}

/** Доплата за каждый целый м² (если квадратура указана). */
export const PARTNER_BONUS_PER_SQM_RUB = 1000

/**
 * Предположительный бонус.
 * Для «Смеситель» и «Унитаз» (в т.ч. старые названия с «Установка») — фикс 500 ₽.
 * Иначе: 1000 ₽ + 1000 ₽ × м² (целые м²); без квадратуры — только 1000 ₽.
 */
export function estimatePartnerRequestBonus(
  squareMeters: number | string | null | undefined,
  categoryName?: string | null,
): number {
  if (isReducedPartnerBonusCategory(categoryName)) {
    return PARTNER_BONUS_REDUCED_BASE_RUB
  }
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
