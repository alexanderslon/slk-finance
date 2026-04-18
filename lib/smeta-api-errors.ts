import { NextResponse } from 'next/server'

/** Понятное сообщение при ошибке SQL + detail в dev. */
export function smetaRouteErrorResponse(error: unknown, logLabel: string): NextResponse {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(logLabel, error)

  const missingTable =
    /undefined_table/i.test(msg) ||
    (/does not exist/i.test(msg) && /construction_estimates/i.test(msg))

  const userMessage = missingTable
    ? 'В базе нет таблицы смет. Выполните SQL из scripts/008-construction-estimates.sql (Neon → SQL Editor).'
    : 'Ошибка сервера при работе с сметами'

  return NextResponse.json(
    {
      error: userMessage,
      ...(process.env.NODE_ENV !== 'production' ? { detail: msg } : {}),
    },
    { status: 500 },
  )
}
