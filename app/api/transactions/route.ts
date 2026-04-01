import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function isSalaryLikeExpense(categoryId: number): Promise<boolean> {
  const rows = await sql`SELECT name, type FROM categories WHERE id = ${categoryId} LIMIT 1`
  const c = rows[0]
  if (!c || c.type !== 'expense') return false
  return ['ЗП', 'Аванс', 'Премия'].includes(c.name)
}

async function applyWorkerSalaryDelta(params: { category_id: number; type: string; amount: number; worker_id: number | null }, direction: 1 | -1) {
  const { category_id, type, amount, worker_id } = params
  if (type !== 'expense') return
  if (!worker_id) return
  const isSalary = await isSalaryLikeExpense(category_id)
  if (!isSalary) return
  await sql`UPDATE workers SET salary_paid = COALESCE(salary_paid, 0) + ${amount * direction} WHERE id = ${worker_id}`
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

    const { wallet_id, category_id, type, amount, description, partner_id, worker_id } = await request.json()

    // Create transaction
    const result = await sql`
      INSERT INTO transactions (wallet_id, category_id, type, amount, description, partner_id, worker_id)
      VALUES (${wallet_id}, ${category_id}, ${type}, ${amount}, ${description}, ${partner_id}, ${worker_id})
      RETURNING *
    `

    // Update wallet balance
    if (type === 'income') {
      await sql`UPDATE wallets SET balance = balance + ${amount} WHERE id = ${wallet_id}`
    } else {
      await sql`UPDATE wallets SET balance = balance - ${amount} WHERE id = ${wallet_id}`
    }

    await applyWorkerSalaryDelta({ category_id, type, amount, worker_id }, 1)

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, wallet_id, category_id, type, amount, description, partner_id, worker_id } = await request.json()

    // Get old transaction to reverse its effect
    const oldTransaction = await sql`SELECT * FROM transactions WHERE id = ${id}`
    if (oldTransaction[0]) {
      const old = oldTransaction[0]
      // Reverse old transaction effect
      if (old.type === 'income') {
        await sql`UPDATE wallets SET balance = balance - ${old.amount} WHERE id = ${old.wallet_id}`
      } else {
        await sql`UPDATE wallets SET balance = balance + ${old.amount} WHERE id = ${old.wallet_id}`
      }

      await applyWorkerSalaryDelta(
        { category_id: old.category_id, type: old.type, amount: Number(old.amount), worker_id: old.worker_id },
        -1,
      )
    }

    // Update transaction
    const result = await sql`
      UPDATE transactions
      SET wallet_id = ${wallet_id}, category_id = ${category_id}, type = ${type}, 
          amount = ${amount}, description = ${description}, partner_id = ${partner_id}, worker_id = ${worker_id}
      WHERE id = ${id}
      RETURNING *
    `

    // Apply new transaction effect
    if (type === 'income') {
      await sql`UPDATE wallets SET balance = balance + ${amount} WHERE id = ${wallet_id}`
    } else {
      await sql`UPDATE wallets SET balance = balance - ${amount} WHERE id = ${wallet_id}`
    }

    await applyWorkerSalaryDelta({ category_id, type, amount, worker_id }, 1)

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Get transaction to reverse its effect
    const transaction = await sql`SELECT * FROM transactions WHERE id = ${id}`
    if (transaction[0]) {
      const t = transaction[0]
      // Reverse transaction effect
      if (t.type === 'income') {
        await sql`UPDATE wallets SET balance = balance - ${t.amount} WHERE id = ${t.wallet_id}`
      } else {
        await sql`UPDATE wallets SET balance = balance + ${t.amount} WHERE id = ${t.wallet_id}`
      }

      await applyWorkerSalaryDelta(
        { category_id: t.category_id, type: t.type, amount: Number(t.amount), worker_id: t.worker_id },
        -1,
      )
    }

    await sql`DELETE FROM transactions WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
