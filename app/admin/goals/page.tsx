import { sql } from '@/lib/db'
import { GoalsManager } from '@/components/goals-manager'

async function getGoals() {
  return await sql`SELECT * FROM goals ORDER BY created_at DESC`
}

export default async function GoalsPage() {
  const goals = await getGoals()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Цели</h1>
        <p className="text-muted-foreground">Финансовые цели и накопления</p>
      </div>

      <GoalsManager initialGoals={goals} />
    </div>
  )
}
