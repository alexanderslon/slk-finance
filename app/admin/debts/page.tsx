import { sql } from '@/lib/db'
import { DebtsManager } from '@/components/debts-manager'

async function getDebts() {
  return await sql`SELECT * FROM debts ORDER BY is_paid ASC, created_at DESC`
}

export default async function DebtsPage() {
  const debts = await getDebts()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Долги</h1>
        <p className="text-muted-foreground">Учет долгов: кому дали и у кого взяли</p>
      </div>

      <DebtsManager initialDebts={debts} />
    </div>
  )
}
