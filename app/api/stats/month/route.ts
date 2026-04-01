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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const month = request.nextUrl.searchParams.get('month')
    const parsed = parseMonthParam(month)
    if (!parsed) {
      return NextResponse.json({ error: 'Укажите month в формате YYYY-MM' }, { status: 400 })
    }

    const { y, m } = parsed
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))

    const rows = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions
      WHERE created_at >= ${start.toISOString()}
        AND created_at < ${end.toISOString()}
    `

    const row = rows[0]
    return NextResponse.json({
      totalIncome: Number(row?.total_income ?? 0),
      totalExpenses: Number(row?.total_expenses ?? 0),
    })
  } catch (error) {
    console.error('GET /api/stats/month:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
