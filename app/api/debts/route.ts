import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const debts = await sql`SELECT * FROM debts ORDER BY is_paid ASC, created_at DESC`
    return NextResponse.json(debts)
  } catch (error) {
    console.error('Error fetching debts:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { debtor_name, type, amount, description, due_date } = await request.json()

    const result = await sql`
      INSERT INTO debts (debtor_name, type, amount, description, due_date)
      VALUES (${debtor_name}, ${type}, ${amount}, ${description}, ${due_date})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating debt:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, is_paid, debtor_name, type, amount, description, due_date } = body

    // If only marking as paid
    if (is_paid !== undefined && !debtor_name) {
      const result = await sql`
        UPDATE debts SET is_paid = ${is_paid}
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result[0])
    }

    const result = await sql`
      UPDATE debts
      SET debtor_name = ${debtor_name}, type = ${type}, amount = ${amount}, 
          description = ${description}, due_date = ${due_date}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating debt:', error)
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

    await sql`DELETE FROM debts WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting debt:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
