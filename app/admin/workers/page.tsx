import { sql } from '@/lib/db'
import { WorkersManager } from '@/components/workers-manager'

async function getWorkers() {
  return await sql`SELECT * FROM workers ORDER BY created_at DESC`
}

export default async function WorkersPage() {
  const workers = await getWorkers()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">Работники</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Управление сотрудниками</p>
      </div>

      <WorkersManager initialWorkers={workers} />
    </div>
  )
}
