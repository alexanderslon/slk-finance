import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { txMulti } from '@/lib/db-tx'
import { getCurrentUser } from '@/lib/auth'
import { estimatePartnerRequestBonus } from '@/lib/partner-bonus'
import { notifyNewPartnerRequest } from '@/lib/telegram'
import { findOrCreateCategory } from '@/lib/categories'

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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }
    const {
      customer_phone,
      address,
      work_comment,
      work_volume,
      recommended_specialist,
      category_name,
    } = body as Record<string, unknown>
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

    if (!customer_phone || typeof customer_phone !== 'string') {
      return NextResponse.json({ error: 'Укажите номер заказчика' }, { status: 400 })
    }

    const categoryName =
      typeof category_name === 'string' && category_name.trim()
        ? String(category_name).trim().slice(0, 255)
        : 'Сантехника'

    const categoryId = await findOrCreateCategory(categoryName, 'expense')

    const wVol = typeof work_volume === 'string' && work_volume.trim() ? work_volume.trim() : null
    const wRec =
      typeof recommended_specialist === 'string' && recommended_specialist.trim()
        ? recommended_specialist.trim()
        : null
    const wCom = typeof work_comment === 'string' && work_comment.trim() ? work_comment.trim() : null
    const addr = typeof address === 'string' && address.trim() ? address.trim() : null

    /** Пошагово упрощаем INSERT, если в БД нет части колонок (старые миграции). */
    let result: Awaited<ReturnType<typeof sql>>
    try {
      result = await sql`
        INSERT INTO partner_requests (partner_id, category_id, amount, work_volume, recommended_specialist, work_comment, customer_phone, address, square_meters)
        VALUES (
          ${user.partner_id},
          ${categoryId},
          0,
          ${wVol},
          ${wRec},
          ${wCom},
          ${customer_phone},
          ${addr},
          ${squareMeters}
        )
        RETURNING *
      `
    } catch (firstErr) {
      const msg = String((firstErr as Error)?.message || firstErr)
      const maybeMissingColumn =
        /does not exist|42703|column/i.test(msg) &&
        /partner_requests|work_volume|recommended|square_meters|address/i.test(msg)
      if (!maybeMissingColumn) throw firstErr

      console.warn('[requests POST] full insert failed, retrying without work_volume/recommended:', msg)
      try {
        result = await sql`
          INSERT INTO partner_requests (partner_id, category_id, amount, work_comment, customer_phone, address, square_meters)
          VALUES (${user.partner_id}, ${categoryId}, 0, ${wCom}, ${customer_phone}, ${addr}, ${squareMeters})
          RETURNING *
        `
      } catch (secondErr) {
        const msg2 = String((secondErr as Error)?.message || secondErr)
        console.warn('[requests POST] legacy insert failed, retrying without square_meters:', msg2)
        result = await sql`
          INSERT INTO partner_requests (partner_id, category_id, amount, work_comment, customer_phone, address)
          VALUES (${user.partner_id}, ${categoryId}, 0, ${wCom}, ${customer_phone}, ${addr})
          RETURNING *
        `
      }
    }

    const created = result[0]

    // Telegram: не ломаем основной запрос, если Telegram недоступен.
    // На serverless лучше дождаться короткой попытки отправки, иначе процесс может завершиться раньше.
    try {
      await notifyNewPartnerRequest({
        requestId: Number(created.id),
        partnerName: String(user.partner_name || `Partner #${user.partner_id}`),
        amountRub: Number(created.amount || 0),
        squareMeters: created.square_meters ?? null,
        customerPhone: String(created.customer_phone),
        address: created.address ?? null,
        workVolume: created.work_volume ?? wVol,
        recommendedSpecialist: created.recommended_specialist ?? wRec,
        workComment: created.work_comment ?? wCom,
        status: created.status,
      })
    } catch (notifyErr) {
      console.error('[requests POST] notifyNewPartnerRequest failed (заявка уже создана):', notifyErr)
    }

    return NextResponse.json(created)
  } catch (error) {
    console.error('Error creating request:', error)
    const detail =
      process.env.NODE_ENV !== 'production'
        ? { detail: String((error as Error)?.message || error) }
        : {}
    return NextResponse.json({ error: 'Server error', ...detail }, { status: 500 })
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

    const { id, status, admin_comment, wallet_id, actual_work_volume } = body as {
      id?: number | string
      status?: string
      admin_comment?: string | null
      wallet_id?: number | string | null
      actual_work_volume?: string | null
    }

    const idNum = Number(id)
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 })
    }
    if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 })
    }

    const actualVol =
      typeof actual_work_volume === 'string' && actual_work_volume.trim() !== ''
        ? actual_work_volume.trim()
        : null
    const adminCommentVal =
      typeof admin_comment === 'string' && admin_comment.trim() !== '' ? admin_comment : null

    const before = await sql`
      SELECT pr.*, c.name AS category_name
      FROM partner_requests pr
      JOIN categories c ON c.id = pr.category_id
      WHERE pr.id = ${idNum}
    `
    const prev = before[0]
    if (!prev) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

    const approvedTotal =
      status === 'approved'
        ? estimatePartnerRequestBonus(prev.square_meters, prev.category_name)
        : Number(prev.amount)

    // Колонка actual_work_volume может отсутствовать в старых миграциях — пробуем сначала
    // полный апдейт, при ошибке схемы — без неё. Атомарность не нужна (SELECT + один UPDATE).
    let updatedRow: Record<string, unknown> | undefined
    try {
      const r = await sql`
        UPDATE partner_requests
        SET status = ${status},
            admin_comment = ${adminCommentVal},
            actual_work_volume = ${actualVol},
            updated_at = NOW(),
            amount = ${approvedTotal}
        WHERE id = ${idNum}
        RETURNING *
      `
      updatedRow = r[0]
    } catch (updErr) {
      const msg = String((updErr as Error)?.message || updErr)
      const missingActualVol =
        /actual_work_volume|does not exist|42703/i.test(msg) &&
        /partner_requests|column/i.test(msg)
      if (!missingActualVol) throw updErr
      console.warn('[requests PUT] actual_work_volume column missing; updating without it:', msg)
      const r = await sql`
        UPDATE partner_requests
        SET status = ${status},
            admin_comment = ${adminCommentVal},
            updated_at = NOW(),
            amount = ${approvedTotal}
        WHERE id = ${idNum}
        RETURNING *
      `
      updatedRow = r[0]
    }

    if (!updatedRow) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    let bonusAwarded = 0
    const walletIdNum = Number(wallet_id)
    const walletOk =
      status === 'approved' &&
      wallet_id != null &&
      Number.isFinite(walletIdNum) &&
      walletIdNum > 0

    if (walletOk) {
      const req = updatedRow as Record<string, unknown>
      const reqAmount = Number(req.amount)
      const reqCategoryId = Number(req.category_id)
      const reqPartnerId = Number(req.partner_id)
      const shouldAwardBonus = prev.status !== 'approved'

      /*
       * Атомарно: создаём расход, двигаем баланс кошелька и (при первом одобрении)
       * начисляем бонус партнёру. Раньше это были 3 разных запроса, и при сбое
       * посередине в БД оставалось расхождение «заявка одобрена / денег нет / бонус есть».
       */
      await txMulti((tx) => {
        const queries: PromiseLike<unknown[]>[] = [
          tx`
            INSERT INTO transactions (wallet_id, category_id, type, amount, description, partner_id)
            VALUES (${walletIdNum}, ${reqCategoryId}, 'expense', ${reqAmount},
                    ${'Заявка от партнёра'}, ${reqPartnerId})
          `,
          tx`UPDATE wallets SET balance = balance - ${reqAmount} WHERE id = ${walletIdNum}`,
        ]
        if (shouldAwardBonus) {
          queries.push(
            tx`
              UPDATE partners
              SET bonus_balance = COALESCE(bonus_balance, 0) + ${reqAmount}
              WHERE id = ${reqPartnerId}
            `,
          )
        }
        return queries
      })

      if (shouldAwardBonus) bonusAwarded = reqAmount
    }

    return NextResponse.json({ ...updatedRow, bonusAwarded })
  } catch (error) {
    console.error('Error updating request:', error)
    const detail =
      process.env.NODE_ENV !== 'production'
        ? { detail: String((error as Error)?.message || error) }
        : {}
    return NextResponse.json({ error: 'Server error', ...detail }, { status: 500 })
  }
}
