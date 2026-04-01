import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const partnerUsers = await sql`
      SELECT pu.*, p.name as partner_name 
      FROM partner_users pu
      JOIN partners p ON p.id = pu.partner_id
      ORDER BY pu.created_at DESC
    `
    return NextResponse.json(partnerUsers)
  } catch (error) {
    console.error('Error fetching partner users:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { partner_id, username, password } = await request.json()

    // Check if username already exists
    const existing = await sql`SELECT id FROM partner_users WHERE username = ${username}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Логин уже занят' }, { status: 400 })
    }

    const password_hash = await hashPassword(password)

    const result = await sql`
      INSERT INTO partner_users (partner_id, username, password_hash)
      VALUES (${partner_id}, ${username}, ${password_hash})
      RETURNING id, partner_id, username, is_active, created_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating partner user:', error)
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
    const { id, is_active, partner_id, username, password } = body

    // If only toggling active status
    if (is_active !== undefined && !username) {
      const result = await sql`
        UPDATE partner_users SET is_active = ${is_active}
        WHERE id = ${id}
        RETURNING id, partner_id, username, is_active, created_at
      `
      return NextResponse.json(result[0])
    }

    // Full update
    if (password) {
      const password_hash = await hashPassword(password)
      const result = await sql`
        UPDATE partner_users
        SET partner_id = ${partner_id}, username = ${username}, password_hash = ${password_hash}
        WHERE id = ${id}
        RETURNING id, partner_id, username, is_active, created_at
      `
      return NextResponse.json(result[0])
    } else {
      const result = await sql`
        UPDATE partner_users
        SET partner_id = ${partner_id}, username = ${username}
        WHERE id = ${id}
        RETURNING id, partner_id, username, is_active, created_at
      `
      return NextResponse.json(result[0])
    }
  } catch (error) {
    console.error('Error updating partner user:', error)
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

    await sql`DELETE FROM partner_users WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting partner user:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
