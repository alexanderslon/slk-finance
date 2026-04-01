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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Партнеры</h1>
        <p className="text-muted-foreground">Управление партнерами и их аккаунтами</p>
      </div>

      <PartnersManager initialPartners={partners} initialPartnerUsers={partnerUsers} />
    </div>
  )
}
