import { sql } from '@/lib/db'
import { TransactionsManager } from '@/components/transactions-manager'

async function getData() {
  const [transactions, wallets, categories, partners, workers] = await Promise.all([
    sql`
      SELECT t.*, c.name as category_name, w.name as wallet_name,
             p.name as partner_name, wr.name as worker_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN wallets w ON w.id = t.wallet_id
      LEFT JOIN partners p ON p.id = t.partner_id
      LEFT JOIN workers wr ON wr.id = t.worker_id
      WHERE t.type = 'income'
      ORDER BY t.created_at DESC
    `,
    sql`SELECT * FROM wallets ORDER BY name`,
    sql`SELECT * FROM categories WHERE type = 'income' ORDER BY name`,
    sql`SELECT * FROM partners ORDER BY name`,
    sql`SELECT * FROM workers ORDER BY name`,
  ])

  return { transactions, wallets, categories, partners, workers }
}

export default async function IncomePage() {
  const { transactions, wallets, categories, partners, workers } = await getData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Доходы</h1>
        <p className="text-muted-foreground">Управление доходами</p>
      </div>

      <TransactionsManager
        type="income"
        initialTransactions={transactions}
        wallets={wallets}
        categories={categories}
        partners={partners}
        workers={workers}
      />
    </div>
  )
}
