import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { notifyPartnerSupportQuestion } from '@/lib/telegram'
import { formatRuPhoneInput, isCompleteRuMobile, ruPhoneDigits } from '@/lib/phone-format'

const MAX_QUESTION_LEN = 4000

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'partner') {
      return NextResponse.json({ error: 'Требуется вход как партнёр' }, { status: 401 })
    }

    let body: { phone?: unknown; question?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
    const questionRaw = typeof body.question === 'string' ? body.question.trim() : ''

    const profileDigits = ruPhoneDigits(
      typeof user.partner_phone === 'string' ? user.partner_phone : '',
    )
    const profileOk = isCompleteRuMobile(profileDigits)

    let phoneForNotify = phoneRaw
    if (!isCompleteRuMobile(ruPhoneDigits(phoneForNotify))) {
      if (profileOk) {
        phoneForNotify = formatRuPhoneInput(profileDigits)
      } else {
        return NextResponse.json(
          {
            error:
              'Укажите номер телефона в форме или добавьте его в профиль партнёра в админке',
          },
          { status: 400 },
        )
      }
    }

    if (questionRaw.length < 3) {
      return NextResponse.json({ error: 'Опишите вопрос подробнее (минимум 3 символа)' }, { status: 400 })
    }

    if (questionRaw.length > MAX_QUESTION_LEN) {
      return NextResponse.json({ error: 'Слишком длинный текст вопроса' }, { status: 400 })
    }

    await notifyPartnerSupportQuestion({
      phone: phoneForNotify,
      question: questionRaw,
      partnerName: String(user.partner_name || `Партнёр #${user.partner_id}`),
      partnerId: user.partner_id,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[partner-support POST]', error)
    const detail =
      process.env.NODE_ENV !== 'production'
        ? { detail: String((error as Error)?.message || error) }
        : {}
    return NextResponse.json({ error: 'Не удалось отправить вопрос', ...detail }, { status: 500 })
  }
}
