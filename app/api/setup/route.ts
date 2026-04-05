import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { secureCompareString } from '@/lib/secure-compare'

function configuredSecret(): string | undefined {
  return process.env.SETUP_SECRET?.trim() || undefined
}

function bearerToken(request: NextRequest): string | null {
  const h = request.headers.get('authorization')
  if (!h?.startsWith('Bearer ')) return null
  return h.slice(7).trim() || null
}

function notFoundProduction() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

function rejectUnconfiguredDevelopment() {
  return NextResponse.json(
    {
      error:
        'Задайте SETUP_SECRET в переменных окружения и вызывайте POST с Authorization: Bearer <секрет>',
    },
    { status: 503 },
  )
}

function rejectAuthDevelopment() {
  return NextResponse.json(
    { error: 'Неверный или отсутствующий ключ' },
    { status: 401 },
  )
}

async function runSetup() {
  const passwordHash = await hashPassword('31337')
  const updated = await sql`
    UPDATE users
    SET
      username = 'slk',
      password_hash = ${passwordHash},
      role = 'admin',
      status = 'approved',
      bonus_balance = 0,
      phone = '+7 (999) 111-22-44'
    WHERE id = 1
    RETURNING id, username, role, status, phone
  `
  const row = updated[0]
  return NextResponse.json({
    success: true,
    message: row
      ? 'Пользователь id=1 обновлён (slk, пароль 31337)'
      : 'Строка с id=1 не найдена — UPDATE не затронул ни одной записи',
    updated: row ?? null,
  })
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return notFoundProduction()
  }
  const res = NextResponse.json(
    {
      error:
        'Используйте POST с заголовком Authorization: Bearer и переменной окружения SETUP_SECRET',
    },
    { status: 405 },
  )
  res.headers.set('Allow', 'POST')
  return res
}

export async function POST(request: NextRequest) {
  const secret = configuredSecret()
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd && !secret) {
    return notFoundProduction()
  }
  if (!secret) {
    return rejectUnconfiguredDevelopment()
  }

  const token = bearerToken(request)
  if (!token || !secureCompareString(token, secret)) {
    return isProd ? notFoundProduction() : rejectAuthDevelopment()
  }

  try {
    return await runSetup()
  } catch (error) {
    console.error('[setup]', error)
    return NextResponse.json({ error: 'Операция не выполнена' }, { status: 500 })
  }
}
