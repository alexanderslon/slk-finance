import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { txMulti } from '@/lib/db-tx'
import { getCurrentUser } from '@/lib/auth'

const WORKER_PAYOUT_CATEGORY_KIND: Readonly<Record<string, 'salary' | 'advance' | 'bonus'>> = {
  // legacy names
  ЗП: 'salary',
  Аванс: 'advance',
  Премия: 'bonus',
  // canonical expense names
  'Зарплата работникам': 'salary',
  'Аванс работникам': 'advance',
  'Премия работникам': 'bonus',
}

async function workerPayoutKind(categoryId: number): Promise<'salary' | 'advance' | 'bonus' | null> {
  const rows = await sql`SELECT name, type FROM categories WHERE id = ${categoryId} LIMIT 1`
  const c = rows[0]
  if (!c || c.type !== 'expense') return false
  return WORKER_PAYOUT_CATEGORY_KIND[c.name] ?? null
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toIntId(v: unknown): number | null {
  const n = toFiniteNumber(v)
  if (n === null) return null
  if (n <= 0) return null
  return Math.trunc(n)
}

function toNullableId(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  return toIntId(v)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let transactions
    if (type) {
      transactions = await sql`
        SELECT t.*, c.name as category_name, w.name as wallet_name,
               p.name as partner_name, wr.name as worker_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN wallets w ON w.id = t.wallet_id
        LEFT JOIN partners p ON p.id = t.partner_id
        LEFT JOIN workers wr ON wr.id = t.worker_id
        WHERE t.type = ${type}
        ORDER BY t.created_at DESC
      `
    } else {
      transactions = await sql`
        SELECT t.*, c.name as category_name, w.name as wallet_name,
               p.name as partner_name, wr.name as worker_name
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        LEFT JOIN wallets w ON w.id = t.wallet_id
        LEFT JOIN partners p ON p.id = t.partner_id
        LEFT JOIN workers wr ON wr.id = t.worker_id
        ORDER BY t.created_at DESC
      `
    }

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    const wallet_id = toIntId(body.wallet_id)
    const category_id = toIntId(body.category_id)
    const type = body.type === 'income' || body.type === 'expense' ? body.type : null
    const amount = toFiniteNumber(body.amount)
    const partner_id = toNullableId(body.partner_id)
    const worker_id = toNullableId(body.worker_id)
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim().slice(0, 1000)
        : null

    if (!wallet_id || !category_id || !type || amount === null || amount <= 0) {
      return NextResponse.json(
        { error: 'Заполните кошелёк, категорию, тип и положительную сумму' },
        { status: 400 },
      )
    }

    const payoutKind = type === 'expense' && worker_id ? await workerPayoutKind(category_id) : null
    const balanceDelta = type === 'income' ? amount : -amount

    const [insertResult] = await txMulti((tx) => {
      const queries = [
        tx`
          INSERT INTO transactions (wallet_id, category_id, type, amount, description, partner_id, worker_id)
          VALUES (${wallet_id}, ${category_id}, ${type}, ${amount}, ${description}, ${partner_id}, ${worker_id})
          RETURNING *
        `,
        tx`UPDATE wallets SET balance = balance + ${balanceDelta} WHERE id = ${wallet_id}`,
      ]
      if (payoutKind && worker_id) {
        queries.push(
          tx`UPDATE workers SET salary_paid = COALESCE(salary_paid, 0) + ${amount} WHERE id = ${worker_id}`,
        )
      }
      return queries
    })

    const created = Array.isArray(insertResult) ? insertResult[0] : insertResult
    return NextResponse.json(created)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Не удалось создать операцию' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
    }

    const id = toIntId(body.id)
    const wallet_id = toIntId(body.wallet_id)
    const category_id = toIntId(body.category_id)
    const type = body.type === 'income' || body.type === 'expense' ? body.type : null
    const amount = toFiniteNumber(body.amount)
    const partner_id = toNullableId(body.partner_id)
    const worker_id = toNullableId(body.worker_id)
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim().slice(0, 1000)
        : null

    if (!id || !wallet_id || !category_id || !type || amount === null || amount <= 0) {
      return NextResponse.json(
        { error: 'Заполните id, кошелёк, категорию, тип и положительную сумму' },
        { status: 400 },
      )
    }

    const oldRows = await sql`SELECT * FROM transactions WHERE id = ${id}`
    const old = oldRows[0]
    if (!old) {
      return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 })
    }

    const oldAmount = Number(old.amount)
    const reverseDelta = old.type === 'income' ? -oldAmount : oldAmount
    const newDelta = type === 'income' ? amount : -amount

    const oldPayoutKind =
      old.type === 'expense' && old.worker_id ? await workerPayoutKind(Number(old.category_id)) : null
    const newPayoutKind = type === 'expense' && worker_id ? await workerPayoutKind(category_id) : null

    const result = await txMulti((tx) => {
      const queries: PromiseLike<unknown[]>[] = [
        tx`UPDATE wallets SET balance = balance + ${reverseDelta} WHERE id = ${old.wallet_id}`,
      ]
      if (oldPayoutKind && old.worker_id) {
        queries.push(
          tx`UPDATE workers SET salary_paid = COALESCE(salary_paid, 0) - ${oldAmount} WHERE id = ${old.worker_id}`,
        )
      }
      queries.push(
        tx`
          UPDATE transactions
          SET wallet_id = ${wallet_id}, category_id = ${category_id}, type = ${type},
              amount = ${amount}, description = ${description}, partner_id = ${partner_id}, worker_id = ${worker_id}
          WHERE id = ${id}
          RETURNING *
        `,
      )
      queries.push(tx`UPDATE wallets SET balance = balance + ${newDelta} WHERE id = ${wallet_id}`)
      if (newPayoutKind && worker_id) {
        queries.push(
          tx`UPDATE workers SET salary_paid = COALESCE(salary_paid, 0) + ${amount} WHERE id = ${worker_id}`,
        )
      }
      return queries
    })

    // Возвращаем строку обновлённой транзакции (она в результатах — третий или второй элемент в зависимости от ветки).
    const updated = (result as Array<unknown[] | undefined>)
      .map((row) => (Array.isArray(row) ? row[0] : null))
      .find((row) => row && typeof row === 'object' && 'id' in (row as Record<string, unknown>))

    return NextResponse.json(updated ?? { id })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Не удалось обновить операцию' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = toIntId(searchParams.get('id'))
    if (!id) {
      return NextResponse.json({ error: 'Не указан id' }, { status: 400 })
    }

    const oldRows = await sql`SELECT * FROM transactions WHERE id = ${id}`
    const old = oldRows[0]
    if (!old) {
      return NextResponse.json({ error: 'Операция не найдена' }, { status: 404 })
    }

    const oldAmount = Number(old.amount)
    const reverseDelta = old.type === 'income' ? -oldAmount : oldAmount
    const oldPayoutKind =
      old.type === 'expense' && old.worker_id ? await workerPayoutKind(Number(old.category_id)) : null

    await txMulti((tx) => {
      const queries: PromiseLike<unknown[]>[] = [
        tx`UPDATE wallets SET balance = balance + ${reverseDelta} WHERE id = ${old.wallet_id}`,
      ]
      if (oldPayoutKind && old.worker_id) {
        queries.push(
          tx`UPDATE workers SET salary_paid = COALESCE(salary_paid, 0) - ${oldAmount} WHERE id = ${old.worker_id}`,
        )
      }
      queries.push(tx`DELETE FROM transactions WHERE id = ${id}`)
      return queries
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Не удалось удалить операцию' }, { status: 500 })
  }
}
