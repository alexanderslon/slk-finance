import { sql } from './db'
import { cookies } from 'next/headers'

async function ensureDevDefaultAdmin(username: string, password: string) {
  if (process.env.NODE_ENV === 'production') return
  if (username !== 'slk' || password !== '31337') return

  const passwordHash = await hashPassword(password)
  await sql`
    INSERT INTO users (username, password_hash, role, status)
    VALUES (${username}, ${passwordHash}, 'admin', 'approved')
    ON CONFLICT (username)
    DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', status = 'approved'
  `
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.PASSWORD_SALT || 'slk-finance-salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSession(userId: number, userType: 'admin' | 'partner'): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  await sql`
    INSERT INTO sessions (user_id, user_type, token, expires_at)
    VALUES (${userId}, ${userType}, ${token}, ${expiresAt.toISOString()})
  `
  
  return token
}

export async function getSession(token: string) {
  const sessions = await sql`
    SELECT * FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
  `
  return sessions[0] || null
}

export async function deleteSession(token: string) {
  await sql`DELETE FROM sessions WHERE token = ${token}`
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session_token')?.value
  
  if (!token) return null
  
  const session = await getSession(token)
  if (!session) return null

  if (session.user_type === 'admin') {
    const users = await sql`SELECT * FROM users WHERE id = ${session.user_id}`
    const user = users[0]
    if (!user) return null
    return { ...user, userType: 'admin' as const }
  }

  if (session.user_type === 'partner') {
    const rows = await sql`
      SELECT pu.id as partner_user_id, pu.username, pu.partner_id, pu.is_active,
             p.name as partner_name, p.phone as partner_phone, p.bonus_balance
      FROM partner_users pu
      JOIN partners p ON p.id = pu.partner_id
      WHERE pu.id = ${session.user_id} AND pu.is_active = true
    `
    const u = rows[0]
    if (!u) return null
    return {
      ...u,
      userType: 'partner' as const,
    }
  }

  return null
}

export async function loginAdmin(username: string, password: string) {
  await ensureDevDefaultAdmin(username, password)

  const users = await sql`SELECT * FROM users WHERE username = ${username} AND role = 'admin'`
  const user = users[0]
  
  if (!user) return { error: 'Неверный логин или пароль' }
  
  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) return { error: 'Неверный логин или пароль' }
  
  const token = await createSession(user.id, 'admin')
  return { token, user }
}

export async function loginPartner(username: string, password: string) {
  const rows = await sql`
    SELECT * FROM partner_users
    WHERE username = ${username} AND is_active = true
  `
  const user = rows[0]

  if (!user) return { error: 'Неверный логин или пароль' }

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) return { error: 'Неверный логин или пароль' }
  
  const token = await createSession(user.id, 'partner')
  return { token, user }
}

export async function registerPartner(name: string, phone: string, password: string) {
  // Check if phone already exists as partner login
  const existing = await sql`SELECT id FROM partner_users WHERE username = ${phone}`
  if (existing.length > 0) {
    return { error: 'Пользователь с таким номером уже существует' }
  }
  
  const passwordHash = await hashPassword(password)

  const partnerRows = await sql`
    INSERT INTO partners (name, phone, bonus_balance)
    VALUES (${name}, ${phone}, 0)
    RETURNING id
  `

  const partnerId = partnerRows[0]?.id
  if (!partnerId) return { error: 'Ошибка создания партнера' }

  const userRows = await sql`
    INSERT INTO partner_users (partner_id, username, password_hash, is_active)
    VALUES (${partnerId}, ${phone}, ${passwordHash}, true)
    RETURNING id
  `

  return { success: true, partnerId, partnerUserId: userRows[0]?.id }
}
