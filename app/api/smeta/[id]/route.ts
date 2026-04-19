import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { smetaRouteErrorResponse } from '@/lib/smeta-api-errors'
import { deriveTitleFromStored, mergeStoredPayload, type StoredEstimateJson } from '@/lib/smeta-persist'

type Ctx = { params: Promise<{ id: string }> }

function toNum(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function jsonStringifyPayload(data: unknown): string {
  return typeof data === 'string' ? data : JSON.stringify(data ?? {})
}

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
      SELECT
        id,
        title,
        document_number,
        customer_name,
        address,
        phone,
        square_meters,
        total_amount,
        prepayment,
        partner_request_id,
        payload,
        data,
        created_at,
        updated_at
      FROM construction_estimates
      WHERE id = ${id} AND user_id = ${user.id}
    `

    const row = rows[0] as
      | {
          payload: unknown
          data: unknown
          [key: string]: unknown
        }
      | undefined

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const merged = mergeStoredPayload(row.data, row.payload)

    return NextResponse.json({
      ...row,
      payload: merged,
    })
  } catch (error) {
    return smetaRouteErrorResponse(error, '[smeta GET id]')
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

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const hasPayload = body.payload !== undefined && body.payload !== null
    const hasData =
      body.data !== undefined && body.data !== null && typeof body.data === 'object'

    if (!hasPayload && !hasData) {
      return NextResponse.json({ error: 'Нужны поля payload или data' }, { status: 400 })
    }

    let title: string
    let stored: StoredEstimateJson
    let document_number = ''
    let customer_name = ''
    let address = ''
    let phone = ''
    let square_meters: number | null = null
    let total_amount: number | null = null
    let prepaymentNum: number | null = null
    let partner_request_id: number | null = null

    if (hasData) {
      document_number =
        typeof body.document_number === 'string' ? body.document_number.trim() : ''
      customer_name = typeof body.customer_name === 'string' ? body.customer_name : ''
      address = typeof body.address === 'string' ? body.address : ''
      phone = typeof body.phone === 'string' ? body.phone : ''
      square_meters = toNum(body.square_meters)
      total_amount = toNum(body.total_amount)
      prepaymentNum = toNum(body.prepayment)
      partner_request_id = toNum(body.partner_request_id)
      stored = body.data as StoredEstimateJson
      title =
        typeof body.title === 'string' && body.title.trim()
          ? body.title.trim()
          : [document_number, customer_name.trim()].filter(Boolean).join(' · ') ||
            deriveTitleFromStored(stored) ||
            'Смета'
    } else {
      const titleRaw = typeof body.title === 'string' ? body.title.trim() : ''
      title = titleRaw || 'Смета'
      stored = body.payload as StoredEstimateJson
    }

    const json = jsonStringifyPayload(stored)

    const result = await sql`
      UPDATE construction_estimates
      SET
        title = ${title},
        payload = ${json}::jsonb,
        document_number = ${document_number || null},
        customer_name = ${customer_name},
        address = ${address},
        phone = ${phone},
        square_meters = ${square_meters},
        total_amount = ${total_amount},
        prepayment = ${prepaymentNum},
        data = ${json}::jsonb,
        partner_request_id = ${partner_request_id},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id, title, document_number, created_at, updated_at
    `

    if (!result[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    return smetaRouteErrorResponse(error, '[smeta PUT]')
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
    return smetaRouteErrorResponse(error, '[smeta DELETE]')
  }
}
