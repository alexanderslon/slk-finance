import { SITE_NAME } from '@/lib/branding'

type TelegramNotificationParams = {
  /** Заголовок блока, например "Новая заявка 📋" */
  title: string
  /** HTML-текст сообщения (Telegram parse_mode=HTML) */
  html: string
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
  if (!cfg) return

  const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`

  const payload: Record<string, unknown> = {
    chat_id: cfg.chatId,
    text: `<b>${escapeHtml(SITE_NAME)}</b>\n\n<b>${escapeHtml(params.title)}</b>\n${params.html}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }

  if (cfg.threadId) {
    payload.message_thread_id = cfg.threadId
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

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

