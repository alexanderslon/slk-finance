import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function parseMonthParam(raw: string | null): { y: number; m: number } | null {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null
  const y = Number(raw.slice(0, 4))
  const m = Number(raw.slice(5, 7))
  if (m < 1 || m > 12) return null
  return { y, m }
}

function monthBounds(y: number, m: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
  return { start, end }
}

function toYm(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Аналитика для дашборда:
 *  - 12 последних месяцев: доход / расход / нетто (для столбчатой диаграммы);
 *  - топ-10 категорий расхода и дохода за выбранный месяц (для пончиков);
 *  - топ-10 контрагентов по сумме расхода/дохода за выбранный месяц.
 *
 * Все цифры в рублях (numeric → number). Запрос выполняется одним POST с парой
 * месяца YYYY-MM, чтобы дашборд можно было пересчитать без перезагрузки страницы.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const monthRaw = request.nextUrl.searchParams.get('month')
    const parsed = parseMonthParam(monthRaw)
    if (!parsed) {
      return NextResponse.json({ error: 'Укажите month=YYYY-MM' }, { status: 400 })
    }

    const { y, m } = parsed
    const { start, end } = monthBounds(y, m)

    // 12-месячное окно, заканчивающееся выбранным месяцем (включительно).
    const cashflowEnd = end
    const cashflowStart = new Date(Date.UTC(y, m - 12, 1, 0, 0, 0, 0))

    const [cashflowRows, expByCategory, incByCategory, topCounterparties] = await Promise.all([
      sql`
        SELECT
          to_char(date_trunc('month', created_at), 'YYYY-MM') AS ym,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::float AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::float AS expense
        FROM transactions
        WHERE created_at >= ${cashflowStart.toISOString()}
          AND created_at < ${cashflowEnd.toISOString()}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      sql`
        SELECT c.name AS category, COALESCE(SUM(t.amount), 0)::float AS total
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.type = 'expense'
          AND t.created_at >= ${start.toISOString()}
          AND t.created_at < ${end.toISOString()}
        GROUP BY c.name
        ORDER BY total DESC
        LIMIT 10
      `,
      sql`
        SELECT c.name AS category, COALESCE(SUM(t.amount), 0)::float AS total
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.type = 'income'
          AND t.created_at >= ${start.toISOString()}
          AND t.created_at < ${end.toISOString()}
        GROUP BY c.name
        ORDER BY total DESC
        LIMIT 10
      `,
      sql`
        SELECT
          COALESCE(p.name, w.name, 'Без получателя') AS name,
          CASE WHEN p.id IS NOT NULL THEN 'partner'
               WHEN w.id IS NOT NULL THEN 'worker'
               ELSE 'other' END AS kind,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::float AS expense,
          COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0)::float AS income
        FROM transactions t
        LEFT JOIN partners p ON p.id = t.partner_id
        LEFT JOIN workers  w ON w.id = t.worker_id
        WHERE t.created_at >= ${start.toISOString()}
          AND t.created_at < ${end.toISOString()}
          AND (t.partner_id IS NOT NULL OR t.worker_id IS NOT NULL)
        GROUP BY name, kind
        ORDER BY expense DESC, income DESC
        LIMIT 10
      `,
    ])

    // Заполняем месяцы без операций нулями, чтобы график был ровный.
    const cashflowMap = new Map<string, { income: number; expense: number }>(
      cashflowRows.map((r: { ym: string; income: number; expense: number }) => [
        r.ym,
        { income: Number(r.income), expense: Number(r.expense) },
      ]),
    )
    const cashflow: Array<{ ym: string; income: number; expense: number; net: number }> = []
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, m - 1 - i, 1, 0, 0, 0, 0))
      const ym = toYm(dt)
      const v = cashflowMap.get(ym) ?? { income: 0, expense: 0 }
      cashflow.push({ ym, income: v.income, expense: v.expense, net: v.income - v.expense })
    }

    return NextResponse.json({
      month: monthRaw,
      cashflow,
      expensesByCategory: expByCategory.map((r: { category: string | null; total: number }) => ({
        category: r.category ?? 'Без категории',
        total: Number(r.total),
      })),
      incomesByCategory: incByCategory.map((r: { category: string | null; total: number }) => ({
        category: r.category ?? 'Без категории',
        total: Number(r.total),
      })),
      topCounterparties: topCounterparties.map(
        (r: { name: string; kind: 'partner' | 'worker' | 'other'; expense: number; income: number }) => ({
          name: r.name,
          kind: r.kind,
          expense: Number(r.expense),
          income: Number(r.income),
        }),
      ),
    })
  } catch (error) {
    console.error('GET /api/stats/analytics:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
