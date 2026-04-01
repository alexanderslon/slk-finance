import { NextRequest, NextResponse } from 'next/server'
import { loginAdmin, loginPartner } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { username, password, type } = await request.json()

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

    const cookieStore = await cookies()
    cookieStore.set('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
