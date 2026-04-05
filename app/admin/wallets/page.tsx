import { sql } from '@/lib/db'
import { WalletsManager } from '@/components/wallets-manager'

async function getWallets() {
  return await sql`SELECT * FROM wallets ORDER BY created_at DESC`
}

export default async function WalletsPage() {
  const wallets = await getWallets()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Кошельки</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Управление счетами и кошельками</p>
      </div>

      <WalletsManager initialWallets={wallets} />
    </div>
  )
}
