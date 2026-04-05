import { sql } from '@/lib/db'
import { GoalsManager } from '@/components/goals-manager'

async function getGoals() {
  return await sql`SELECT * FROM goals ORDER BY created_at DESC`
}

export default async function GoalsPage() {
  const goals = await getGoals()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Цели</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Финансовые цели и накопления</p>
      </div>

      <GoalsManager initialGoals={goals} />
    </div>
  )
}
