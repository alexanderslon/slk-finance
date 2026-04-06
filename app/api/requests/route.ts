import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { estimatePartnerRequestBonus } from '@/lib/partner-bonus'
import { notifyNewPartnerRequest } from '@/lib/telegram'

async function ensureExpenseCategory(name: string): Promise<number> {
  const rows = await sql`SELECT id FROM categories WHERE name = ${name} AND type = 'expense' LIMIT 1`
  if (rows[0]?.id) return rows[0].id

  const inserted = await sql`
    INSERT INTO categories (name, type)
    VALUES (${name}, 'expense')
    RETURNING id
  `
  return inserted[0].id
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    let requests
    if (user.userType === 'partner') {
      // Partner can ONLY view their own requests (ignore any query param)
      requests = await sql`
          SELECT pr.*, p.name as partner_name, c.name as category_name
          FROM partner_requests pr
          JOIN partners p ON p.id = pr.partner_id
          JOIN categories c ON c.id = pr.category_id
          WHERE pr.partner_id = ${user.partner_id}
          ORDER BY pr.created_at DESC
        `
    } else {
      // Admin viewing all requests or a specific partner
      const whereClause = partnerId ? sql`WHERE pr.partner_id = ${partnerId}` : sql``
      requests = await sql`
        SELECT pr.*, p.name as partner_name, c.name as category_name
        FROM partner_requests pr
        JOIN partners p ON p.id = pr.partner_id
        JOIN categories c ON c.id = pr.category_id
        ${whereClause}
        ORDER BY 
          CASE WHEN pr.status = 'pending' THEN 0 ELSE 1 END,
          pr.created_at DESC
      `
    }

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'partner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customer_phone, address, work_comment } = body
    const rawSqm = body.square_meters
    let squareMeters: number | null = null
    if (rawSqm !== undefined && rawSqm !== null && rawSqm !== '') {
      const n = Number(rawSqm)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: 'Укажите корректную квадратуру (м²)' }, { status: 400 })
      }
      squareMeters = Math.floor(n)
      if (squareMeters === 0) {
        squareMeters = null
      }
    }

    if (!customer_phone) {
      return NextResponse.json({ error: 'Укажите номер заказчика' }, { status: 400 })
    }

    const categoryId = await ensureExpenseCategory('Сантехника')

    const result = await sql`
      INSERT INTO partner_requests (partner_id, category_id, amount, work_comment, customer_phone, address, square_meters)
      VALUES (${user.partner_id}, ${categoryId}, 0, ${work_comment || null}, ${customer_phone}, ${address || null}, ${squareMeters})
      RETURNING *
    `

    const created = result[0]

    // Telegram: не ломаем основной запрос, если Telegram недоступен.
    // На serverless лучше дождаться короткой попытки отправки, иначе процесс может завершиться раньше.
    await notifyNewPartnerRequest({
      requestId: Number(created.id),
      partnerName: String(user.partner_name || `Partner #${user.partner_id}`),
      amountRub: Number(created.amount || 0),
      squareMeters: created.square_meters ?? null,
      customerPhone: String(created.customer_phone),
      address: created.address ?? null,
      workComment: created.work_comment ?? null,
      status: created.status,
    })

    return NextResponse.json(created)
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status, admin_comment, wallet_id } = await request.json()

    const before = await sql`SELECT * FROM partner_requests WHERE id = ${id}`
    const prev = before[0]
    if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const approvedTotal =
      status === 'approved' ? estimatePartnerRequestBonus(prev.square_meters) : Number(prev.amount)

    // Update request status (сумма заявки = итоговый бонус при одобрении: база + м²)
    const result = await sql`
      UPDATE partner_requests
      SET status = ${status}, admin_comment = ${admin_comment}, updated_at = NOW(),
          amount = ${approvedTotal}
      WHERE id = ${id}
      RETURNING *
    `

    // If approved, create expense transaction
    let bonusAwarded = 0
    if (status === 'approved' && wallet_id) {
      const req = result[0]

      // Create expense transaction
      await sql`
        INSERT INTO transactions (wallet_id, category_id, type, amount, description, partner_id)
        VALUES (${wallet_id}, ${req.category_id}, 'expense', ${req.amount}, 
                ${'Заявка от партнёра'}, ${req.partner_id})
      `

      // Update wallet balance
      await sql`UPDATE wallets SET balance = balance - ${req.amount} WHERE id = ${wallet_id}`

      // Начислить партнёру тот же итог, что и в заявке (1000 + 1000×м²), только при первом одобрении
      if (prev.status !== 'approved') {
        bonusAwarded = Number(req.amount)
        await sql`
          UPDATE partners
          SET bonus_balance = COALESCE(bonus_balance, 0) + ${bonusAwarded}
          WHERE id = ${req.partner_id}
        `
      }
    }

    return NextResponse.json({ ...result[0], bonusAwarded })
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
