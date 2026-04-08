import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PartnerDashboard } from '@/components/partner-dashboard'
import { ensureDefaultExpenseCategories } from '@/lib/categories'

async function getData(partnerId: number) {
  await ensureDefaultExpenseCategories()
  const [requests, categories, partners] = await Promise.all([
    sql`
      SELECT pr.*, c.name as category_name
      FROM partner_requests pr
      JOIN categories c ON c.id = pr.category_id
      WHERE pr.partner_id = ${partnerId}
      ORDER BY pr.created_at DESC
    `,
    sql`SELECT * FROM categories WHERE type = 'expense' ORDER BY name`,
    sql`SELECT bonus_balance FROM partners WHERE id = ${partnerId}`,
  ])

  return { requests, categories, bonusBalance: Number(partners[0]?.bonus_balance || 0) }
}

export default async function PartnerPage() {
  const user = await getCurrentUser()
  if (!user || user.userType !== 'partner') {
    return null
  }

  const { requests, categories, bonusBalance } = await getData(user.partner_id)

  return (
    <PartnerDashboard
      requests={requests}
      categories={categories}
      partnerId={user.partner_id}
      partnerName={user.partner_name}
      bonusBalance={bonusBalance}
    />
  )
}
