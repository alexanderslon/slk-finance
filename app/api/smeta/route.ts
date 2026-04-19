import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { smetaRouteErrorResponse } from '@/lib/smeta-api-errors'
import { applySmetaCors } from '@/lib/smeta-cors'
import { isSmetaIngestAuthorized, requireIngestUserId } from '@/lib/smeta-ingest'
import { deriveTitleFromStored, type StoredEstimateJson } from '@/lib/smeta-persist'

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

export async function OPTIONS(request: NextRequest) {
  const res = new NextResponse(null, { status: 204 })
  return applySmetaCors(request, res)
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await sql`
      SELECT
        id,
        COALESCE(
          NULLIF(TRIM(document_number), ''),
          NULLIF(TRIM(title), ''),
          'Смета'
        ) AS title,
        created_at,
        updated_at
      FROM construction_estimates
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
      LIMIT 200
    `
    return NextResponse.json(rows)
  } catch (error) {
    return smetaRouteErrorResponse(error, '[smeta GET]')
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      const res = NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
      return applySmetaCors(request, res)
    }

    const external = isSmetaIngestAuthorized(request)

    if (external) {
      if (!process.env.SMETA_INGEST_SECRET?.trim()) {
        const res = NextResponse.json(
          { success: false, error: 'Внешнее сохранение смет отключено' },
          { status: 503 },
        )
        return applySmetaCors(request, res)
      }

      const document_number = typeof body.document_number === 'string' ? body.document_number.trim() : ''
      const data = body.data
      if (!document_number || data === undefined || data === null) {
        const res = NextResponse.json(
          { success: false, error: 'document_number и data обязательны' },
          { status: 400 },
        )
        return applySmetaCors(request, res)
      }

      const userId = requireIngestUserId(body.created_by)
      if (!userId) {
        const res = NextResponse.json(
          {
            success: false,
            error:
              'Укажите created_by (id пользователя в SLK) или задайте SMETA_INGEST_USER_ID в Vercel',
          },
          { status: 400 },
        )
        return applySmetaCors(request, res)
      }

      const customer_name = typeof body.customer_name === 'string' ? body.customer_name : ''
      const address = typeof body.address === 'string' ? body.address : ''
      const phone = typeof body.phone === 'string' ? body.phone : ''
      const square_meters = toNum(body.square_meters)
      const total_amount = toNum(body.total_amount)
      const prepayment = toNum(body.prepayment) ?? 0
      const partner_request_id = toNum(body.partner_request_id)

      const title =
        [document_number, String(customer_name).trim()].filter(Boolean).join(' · ') || 'Смета'
      const json = jsonStringifyPayload(data)

      const result = await sql`
        INSERT INTO construction_estimates (
          user_id,
          title,
          payload,
          document_number,
          customer_name,
          address,
          phone,
          square_meters,
          total_amount,
          prepayment,
          data,
          partner_request_id
        )
        VALUES (
          ${userId},
          ${title},
          ${json}::jsonb,
          ${document_number},
          ${customer_name},
          ${address},
          ${phone},
          ${square_meters},
          ${total_amount},
          ${prepayment},
          ${json}::jsonb,
          ${partner_request_id}
        )
        RETURNING id, document_number, created_at
      `

      const row = result[0] as { id: number; document_number: string | null; created_at: Date }
      const ok = NextResponse.json({
        success: true,
        message: 'Смета успешно сохранена',
        estimate: {
          id: row.id,
          document_number: row.document_number ?? document_number,
          created_at: row.created_at,
        },
      })
      return applySmetaCors(request, ok)
    }

    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPayload = body.payload !== undefined && body.payload !== null
    const hasData =
      body.data !== undefined && body.data !== null && typeof body.data === 'object'

    if (!hasPayload && !hasData) {
      return NextResponse.json(
        { error: 'Нужны поля payload или data' },
        { status: 400 },
      )
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
      INSERT INTO construction_estimates (
        user_id,
        title,
        payload,
        document_number,
        customer_name,
        address,
        phone,
        square_meters,
        total_amount,
        prepayment,
        data,
        partner_request_id
      )
      VALUES (
        ${user.id},
        ${title},
        ${json}::jsonb,
        ${document_number || null},
        ${customer_name},
        ${address},
        ${phone},
        ${square_meters},
        ${total_amount},
        ${prepaymentNum},
        ${json}::jsonb,
        ${partner_request_id}
      )
      RETURNING id, title, document_number, created_at, updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    return smetaRouteErrorResponse(error, '[smeta POST]')
  }
}
