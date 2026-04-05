import { sql } from '@/lib/db'
import { DebtsManager } from '@/components/debts-manager'

async function getDebts() {
  return await sql`SELECT * FROM debts ORDER BY is_paid ASC, created_at DESC`
}

export default async function DebtsPage() {
  const debts = await getDebts()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Долги</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Учет долгов: кому дали и у кого взяли</p>
      </div>

      <DebtsManager initialDebts={debts} />
    </div>
  )
}
