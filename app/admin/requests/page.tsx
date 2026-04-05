import { sql } from '@/lib/db'
import { RequestsManager } from '@/components/requests-manager'

async function getData() {
  const [requests, wallets] = await Promise.all([
    sql`
      SELECT pr.*, p.name as partner_name, c.name as category_name
      FROM partner_requests pr
      JOIN partners p ON p.id = pr.partner_id
      JOIN categories c ON c.id = pr.category_id
      ORDER BY 
        CASE WHEN pr.status = 'pending' THEN 0 ELSE 1 END,
        pr.created_at DESC
    `,
    sql`SELECT * FROM wallets ORDER BY name`,
  ])

  return { requests, wallets }
}

export default async function RequestsPage() {
  const { requests, wallets } = await getData()
  const pendingCount = requests.filter((r: { status: string }) => r.status === 'pending').length

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Заявки от партнеров</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Обработка заявок на расходы · Новые: {pendingCount}
        </p>
      </div>

      <RequestsManager initialRequests={requests} wallets={wallets} />
    </div>
  )
}
