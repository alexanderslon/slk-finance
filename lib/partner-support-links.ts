/**
 * Контакты поддержки в партнёрском кабинете.
 *
 * Опционально в `.env`:
 * - NEXT_PUBLIC_SUPPORT_TELEGRAM_URL — ссылка на Telegram (бот или @username), например https://t.me/your_bot
 * - NEXT_PUBLIC_SUPPORT_EMAIL — почта для mailto:
 */

export const PARTNER_HELP_PHONE_DISPLAY = '+7 (900) 555-58-13'

export const PARTNER_HELP_TEL_HREF = 'tel:+79005555813'

/** Ссылка для кнопки «Telegram»: из env или общая точка входа (лучше задать NEXT_PUBLIC_SUPPORT_TELEGRAM_URL). */
export function partnerHelpTelegramHref(): string {
  const u = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL?.trim()
  return u || 'https://t.me'
}

export function partnerHelpMailtoHref(): string | null {
  const e = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()
  if (!e) return null
  return `mailto:${e}`
}
