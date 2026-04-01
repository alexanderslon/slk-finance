import { neon } from '@neondatabase/serverless'
import postgres from 'postgres'

function isLocalPostgresUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'postgresql:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1')
    )
  } catch {
    return false
  }
}

const databaseUrl = process.env.DATABASE_URL!

// neon() is great for Neon (serverless) Postgres, but it uses fetch and won't work with local Postgres on localhost:5432.
function normalizeLocalDatabaseUrl(url: string): string {
  try {
    const u = new URL(url)
    if (!isLocalPostgresUrl(url)) return url
    // Some tools add ?schema=public (Prisma-style). `postgres` treats URL params as connection options and will error.
    u.searchParams.delete('schema')
    return u.toString()
  } catch {
    return url
  }
}

export const sql = isLocalPostgresUrl(databaseUrl)
  ? postgres(normalizeLocalDatabaseUrl(databaseUrl))
  : neon(databaseUrl)

export type User = {
  id: number
  username: string
  password_hash: string
  role: 'admin' | 'partner'
  created_at: Date
}

export type Wallet = {
  id: number
  name: string
  balance: number
  currency: string
  created_at: Date
}

export type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  icon?: string
}

export type Transaction = {
  id: number
  wallet_id: number
  category_id: number
  type: 'income' | 'expense'
  amount: number
  description?: string
  partner_id?: number
  worker_id?: number
  created_at: Date
  category_name?: string
  wallet_name?: string
  partner_name?: string
  worker_name?: string
}

export type Debt = {
  id: number
  debtor_name: string
  type: 'given' | 'taken'
  amount: number
  description?: string
  due_date?: Date
  is_paid: boolean
  created_at: Date
}

export type Goal = {
  id: number
  name: string
  target_amount: number
  current_amount: number
  deadline?: Date
  created_at: Date
}

export type Worker = {
  id: number
  name: string
  position?: string
  salary?: number
  salary_paid?: number
  phone?: string
  created_at: Date
}

export type Partner = {
  id: number
  name: string
  phone?: string
  email?: string
  created_at: Date
}

export type PartnerUser = {
  id: number
  partner_id: number
  username: string
  password_hash: string
  is_active: boolean
  created_at: Date
  partner_name?: string
}

export type PartnerRequest = {
  id: number
  partner_id: number
  category_id: number
  amount: number
  work_comment?: string
  customer_phone: string
  address?: string
  /** Площадь объекта, м² (необязательно) */
  square_meters?: number | null
  status: 'pending' | 'approved' | 'rejected'
  admin_comment?: string
  created_at: Date
  updated_at: Date
  partner_name?: string
  category_name?: string
}

export type Session = {
  id: number
  user_id: number
  token: string
  user_type: 'admin' | 'partner'
  expires_at: Date
  created_at: Date
}
