import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql`
      SELECT id, title, created_at, updated_at
      FROM construction_estimates
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
      LIMIT 200
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error('[smeta GET]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { title?: unknown; payload?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const titleRaw = typeof body.title === 'string' ? body.title.trim() : ''
    const title = titleRaw || 'Смета'
    if (body.payload === undefined || body.payload === null) {
      return NextResponse.json({ error: 'payload required' }, { status: 400 })
    }

    const json = JSON.stringify(body.payload)

    const result = await sql`
      INSERT INTO construction_estimates (user_id, title, payload)
      VALUES (${user.id}, ${title}, ${json}::jsonb)
      RETURNING id, title, created_at, updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('[smeta POST]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
