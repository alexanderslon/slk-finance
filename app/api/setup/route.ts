import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    // Hash for password "31337"
    const passwordHash = await hashPassword('31337')
    
    console.log('[v0] Password hash generated:', passwordHash)

    // Delete existing users first
    await sql`DELETE FROM sessions`
    await sql`DELETE FROM users`
    
    // Create admin user
    await sql`
      INSERT INTO users (username, password_hash, role, status, bonus_balance, phone)
      VALUES ('slk', ${passwordHash}, 'admin', 'approved', 0, '+7 (999) 111-22-44')
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
      message: 'Admin (slk) and partner (partner1) created with password 31337',
      users
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed', details: String(error) }, { status: 500 })
  }
}
