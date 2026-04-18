import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const rows = await sql`
      SELECT id, title, payload, created_at, updated_at
      FROM construction_estimates
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (!rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('[smeta GET id]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
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
      UPDATE construction_estimates
      SET title = ${title},
          payload = ${json}::jsonb,
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id, title, created_at, updated_at
    `

    if (!result[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('[smeta PUT]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await context.params
    const id = Number(idParam)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM construction_estimates
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `

    if (!result[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[smeta DELETE]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
