import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goals = await sql`SELECT * FROM goals ORDER BY created_at DESC`
    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, target_amount, current_amount, deadline } = await request.json()

    const result = await sql`
      INSERT INTO goals (name, target_amount, current_amount, deadline)
      VALUES (${name}, ${target_amount}, ${current_amount || 0}, ${deadline})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating goal:', error)
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
    const { id, current_amount, name, target_amount, deadline } = body

    // If only updating current amount
    if (current_amount !== undefined && !name) {
      const result = await sql`
        UPDATE goals SET current_amount = ${current_amount}
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json(result[0])
    }

    const result = await sql`
      UPDATE goals
      SET name = ${name}, target_amount = ${target_amount}, 
          current_amount = ${current_amount || 0}, deadline = ${deadline}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating goal:', error)
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

    await sql`DELETE FROM goals WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
