import { sql } from '@/lib/db'
import { PartnersManager } from '@/components/partners-manager'

async function getData() {
  const [partners, partnerUsers] = await Promise.all([
    sql`SELECT * FROM partners ORDER BY created_at DESC`,
    sql`
      SELECT pu.*, p.name as partner_name 
      FROM partner_users pu
      JOIN partners p ON p.id = pu.partner_id
      ORDER BY pu.created_at DESC
    `,
  ])

  return { partners, partnerUsers }
}

export default async function PartnersPage() {
  const { partners, partnerUsers } = await getData()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Партнеры</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Управление партнерами и их аккаунтами</p>
      </div>

      <PartnersManager initialPartners={partners} initialPartnerUsers={partnerUsers} />
    </div>
  )
}
