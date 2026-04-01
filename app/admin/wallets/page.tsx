import { sql } from '@/lib/db'
import { WalletsManager } from '@/components/wallets-manager'

async function getWallets() {
  return await sql`SELECT * FROM wallets ORDER BY created_at DESC`
}

export default async function WalletsPage() {
  const wallets = await getWallets()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Кошельки</h1>
        <p className="text-muted-foreground">Управление счетами и кошельками</p>
      </div>

      <WalletsManager initialWallets={wallets} />
    </div>
  )
}
