/**
 * Контакты поддержки в партнёрском кабинете.
 *
 * Кнопка Telegram ведёт в тот же чат, куда бот шлёт заявки (`TELEGRAM_CHAT_ID`), если это публичный
 * @username — тогда строится https://t.me/… Если chat_id числовой (часто у групп), задайте вручную:
 * - NEXT_PUBLIC_SUPPORT_TELEGRAM_URL — ссылка-приглашение или t.me/канал
 *
 * Опционально:
 * - NEXT_PUBLIC_SUPPORT_EMAIL — почта для mailto:
 */

export const PARTNER_HELP_PHONE_DISPLAY = '+7 (900) 055-58-13'

export const PARTNER_HELP_TEL_HREF = 'tel:+79000555813'

/**
 * Ссылка для кнопки «Telegram» в кабинете партнёра.
 * Вызывать только на сервере (есть доступ к TELEGRAM_CHAT_ID без префикса NEXT_PUBLIC).
 */
export function partnerTelegramWebHrefFromEnv(): string {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  if (chatId) {
    const name = chatId.startsWith('@') ? chatId.slice(1) : chatId
    if (/^[a-zA-Z_][a-zA-Z0-9_]{3,}$/.test(name)) {
      return `https://t.me/${name}`
    }
  }

  const manual = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL?.trim()
  if (manual) return manual

  return 'https://t.me'
}

/** @deprecated для UI используйте partnerTelegramWebHrefFromEnv на сервере и передайте в PartnerHelpCard */
export function partnerHelpTelegramHref(): string {
  const u = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL?.trim()
  return u || 'https://t.me'
}

/**
 * Для ссылок вида https://t.me/username даёт tg://resolve?domain=… — ОС чаще сразу открывает приложение Telegram,
 * без лишней вкладки в браузере (в отличие от https + target="_blank").
 */
export function telegramOpenHrefPreferApp(webUrl: string): string {
  let u: URL
  try {
    u = new URL(webUrl.includes('://') ? webUrl : `https://${webUrl}`)
  } catch {
    return webUrl
  }

  const host = u.hostname.replace(/^www\./, '')
  if (host !== 't.me' && host !== 'telegram.me' && host !== 'telegram.dog') {
    return webUrl
  }

  const segments = u.pathname.replace(/^\//, '').split('/').filter(Boolean)
  const first = segments[0]
  if (!first) return webUrl

  const reserved = new Set([
    'addstickers',
    'socks',
    'setlanguage',
    'iv',
    'share',
    'login',
    'proxy',
    'addemoji',
    'premium',
    'giftcode',
  ])
  if (reserved.has(first.toLowerCase())) return webUrl

  if (first === 'c' && segments[1]) return webUrl

  if (first.startsWith('+')) {
    const invite = first.slice(1)
    return invite ? `tg://join?invite=${encodeURIComponent(invite)}` : webUrl
  }

  if (first.toLowerCase() === 'joinchat' && segments[1]) {
    return `tg://join?invite=${encodeURIComponent(segments[1])}`
  }

  if (/^[a-zA-Z_][\w]*$/.test(first)) {
    return `tg://resolve?domain=${encodeURIComponent(first)}`
  }

  return webUrl
}

export function partnerHelpMailtoHref(): string | null {
  const e = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()
  if (!e) return null
  return `mailto:${e}`
}
