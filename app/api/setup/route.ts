import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    // Hash for password "31337"
    const passwordHash = await hashPassword('31337')
    
    console.log('[v0] Password hash generated:', passwordHash)

    const users1 = await sql`SELECT * FROM users`
    console.log('[v0] Users in database:', users1)

    // Delete existing users first
    // await sql`DELETE FROM sessions`
    // await sql`DELETE FROM users`
    
    // Обновить пользователя с id = 1 (пароль 31337, админ)
    const updated = await sql`
      UPDATE users
      SET
        username = 'slk',
        password_hash = ${passwordHash},
        role = 'admin',
        status = 'approved',
        bonus_balance = 0,
        phone = '+7 (999) 111-22-44'
      WHERE id = 1
      RETURNING id, username, role, status, phone
    `
    
    // Create sample partner with same password
    // await sql`
    //   INSERT INTO users (username, phone, password_hash, role, status, bonus_balance)
    //   VALUES ('partner1', '+7 (999) 111-22-33', ${passwordHash}, 'partner', 'approved', 2000)
    // `
    
    // Verify users were created
    const users = await sql`SELECT id, username, role, status FROM users`
    console.log('[v0] Users in database:', users)
    
    return NextResponse.json({
      success: true,
      message:
        updated.length > 0
          ? 'Пользователь id=1 обновлён (slk, пароль 31337)'
          : 'Строка с id=1 не найдена — UPDATE не затронул ни одной записи',
      updated,
      users,
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed', details: String(error) }, { status: 500 })
  }
}
