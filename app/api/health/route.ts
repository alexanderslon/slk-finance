import { NextResponse } from 'next/server'

/**
 * Проверка после деплоя: открой https://твой-проект.vercel.app/api/health
 */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        database: 'missing_env',
        hint:
          'В Vercel → Settings → Environment Variables добавь DATABASE_URL (строка Neon, не localhost).',
      },
      { status: 503 },
    )
  }

  try {
    const { sql } = await import('@/lib/db')
    await sql`SELECT 1 as ok`
    return NextResponse.json({ ok: true, database: 'connected' })
  } catch (error) {
    console.error('[health]', error)
    const message = error instanceof Error ? error.message : 'unknown'
    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        hint:
          'Проверь строку Neon (лучше Pooled). Выполни в Neon SQL из scripts/001-create-tables.sql и миграции.',
        detail: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 503 },
    )
  }
}
