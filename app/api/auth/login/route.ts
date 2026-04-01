import { NextRequest, NextResponse } from 'next/server'
import { loginAdmin, loginPartner } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    let body: { username?: string; password?: string; type?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
    }

    const { username, password, type } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 })
    }

    let result
    if (type === 'admin') {
      result = await loginAdmin(username, password)
    } else {
      result = await loginPartner(username, password)
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // next/headers cookies().set() в Route Handlers на Vercel/Next 15+ часто падает;
    // привязка к NextResponse надёжнее для Set-Cookie.
    const response = NextResponse.json({ success: true })
    response.cookies.set('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
