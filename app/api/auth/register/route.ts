import { NextRequest, NextResponse } from 'next/server'
import { registerPartner } from '@/lib/auth'
import { notifyNewPartnerRegistration } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_PUBLIC_REGISTRATION !== 'true'
    ) {
      return NextResponse.json({ error: 'Регистрация отключена' }, { status: 403 })
    }

    const { name, phone, password } = await request.json()

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Пароль должен быть минимум 4 символа' }, { status: 400 })
    }

    const result = await registerPartner(name, phone, password)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Telegram: не ломаем регистрацию, если Telegram недоступен
    await notifyNewPartnerRegistration({
      partnerName: String(name),
      partnerPhone: String(phone),
      passwordHint: password === '31337' ? '31337' : 'Пароль установлен',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
