import { SITE_NAME } from '@/lib/branding'

type TelegramNotificationParams = {
  /** Заголовок блока, например "Новая заявка 📋" */
  title: string
  /** HTML-текст сообщения (Telegram parse_mode=HTML) */
  html: string
  /** Таймаут на запрос к Telegram, мс (по умолчанию 1500) */
  timeoutMs?: number
  /** Переопределить thread_id (например, для разных тем форума) */
  threadId?: number
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function envTrim(name: string): string | null {
  const v = process.env[name]?.trim()
  return v ? v : null
}

function resolveSiteUrl(): string | null {
  const explicit = envTrim('NEXT_PUBLIC_SITE_URL')
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = envTrim('VERCEL_URL')
  if (vercel) return `https://${vercel}`.replace(/\/+$/, '')
  return null
}

function getTelegramConfig(): {
  token: string
  chatId: string
  threadId?: number
} | null {
  const token = envTrim('TELEGRAM_BOT_TOKEN')
  const chatId = envTrim('TELEGRAM_CHAT_ID')
  if (!token || !chatId) return null

  const rawThread = envTrim('TELEGRAM_THREAD_ID')
  if (rawThread) {
    const n = Number(rawThread)
    if (Number.isFinite(n) && n > 0) {
      return { token, chatId, threadId: Math.floor(n) }
    }
  }

  return { token, chatId }
}

/**
 * Асинхронно отправляет уведомление в Telegram.
 * - Не бросает исключения наружу (логирует и возвращает).
 * - Использует parse_mode=HTML (поэтому обязательно экранируйте пользовательский ввод).
 */
export async function sendTelegramNotification(params: TelegramNotificationParams): Promise<void> {
  const cfg = getTelegramConfig()
  if (!cfg) {
    // Чтобы было понятно в логах Vercel, почему "ничего не пришло".
    if (process.env.NODE_ENV !== 'production') {
      console.info('[telegram] skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set')
    }
    return
  }

  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`

  const payload: Record<string, unknown> = {
    chat_id: cfg.chatId,
    text: `<b>${escapeHtml(SITE_NAME)}</b>\n\n<b>${escapeHtml(params.title)}</b>\n${params.html}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }

  const threadId = params.threadId ?? cfg.threadId
  if (threadId) {
    payload.message_thread_id = threadId
  }

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), params.timeoutMs ?? 1500)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(t)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('[telegram] sendMessage failed', res.status, body)
    }
  } catch (err) {
    console.warn('[telegram] sendMessage error', err)
  }
}

export type PartnerRequestTelegramPayload = {
  requestId: number
  partnerName: string
  amountRub: number
  squareMeters?: number | null
  customerPhone: string
  address?: string | null
  workComment?: string | null
  status: 'pending' | 'approved' | 'rejected'
}

function formatRub(amount: number): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount)} ₽`
  }
}

function statusRu(status: PartnerRequestTelegramPayload['status']): string {
  if (status === 'approved') return 'Одобрена'
  if (status === 'rejected') return 'Отклонена'
  return 'На рассмотрении'
}

/**
 * Готовое красивое уведомление именно для новой PartnerRequest.
 * Весь пользовательский ввод экранируется под HTML.
 */
export async function notifyNewPartnerRequest(payload: PartnerRequestTelegramPayload): Promise<void> {
  const siteUrl = resolveSiteUrl()
  const adminUrl = siteUrl ? `${siteUrl}/admin/requests` : null

  const lines: string[] = [
    `<b>Партнёр:</b> ${escapeHtml(payload.partnerName)}`,
    `<b>Сумма:</b> ${escapeHtml(formatRub(payload.amountRub))}`,
  ]

  if (payload.squareMeters !== null && payload.squareMeters !== undefined) {
    lines.push(`<b>Квадратура:</b> ${escapeHtml(String(payload.squareMeters))} м²`)
  }

  lines.push(`<b>Телефон клиента:</b> ${escapeHtml(payload.customerPhone)}`)
  lines.push(`<b>Адрес:</b> ${escapeHtml(payload.address?.trim() ? payload.address : '—')}`)
  lines.push(`<b>Комментарий:</b> ${escapeHtml(payload.workComment?.trim() ? payload.workComment : '—')}`)
  lines.push(`<b>Статус:</b> ${escapeHtml(statusRu(payload.status))}`)
  lines.push(`<b>ID:</b> ${escapeHtml(String(payload.requestId))}`)

  if (adminUrl) {
    lines.push(`\n<a href="${escapeHtml(adminUrl)}">Открыть админку заявок</a>`)
  }

  await sendTelegramNotification({
    title: 'Новая заявка 📋',
    html: `\n${lines.join('\n')}`,
  })
}

export type PartnerRegistrationTelegramPayload = {
  partnerName: string
  partnerPhone: string
  /** Текст для поля "Пароль" (например "31337" или "Пароль установлен") */
  passwordHint: string
}

function parsePositiveInt(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.floor(n)
}

/**
 * Уведомление о регистрации нового партнёра в тему "порт".
 * Тема берётся из TELEGRAM_PORT_THREAD_ID (например 59).
 */
export async function notifyNewPartnerRegistration(
  newPartnerData: PartnerRegistrationTelegramPayload,
): Promise<void> {
  const portThreadId = parsePositiveInt(envTrim('TELEGRAM_PORT_THREAD_ID'))

  console.info('[Telegram] Новый партнёр зарегистрировался')

  const lines: string[] = [
    `🎉 <b>Новый партнёр успешно зарегистрировался</b>`,
    ``,
    `👤 <b>Имя:</b> ${escapeHtml(newPartnerData.partnerName)}`,
    `📱 <b>Телефон:</b> ${escapeHtml(newPartnerData.partnerPhone)}`,
    `🔑 <b>Пароль:</b> ${escapeHtml(newPartnerData.passwordHint)}`,
    ``,
    `✅ <b>Учётная запись создана</b>`,
  ].filter(Boolean)

  await sendTelegramNotification({
    title: 'порт',
    html: `\n${lines.join('\n')}`,
    threadId: portThreadId ?? undefined,
  })
}

