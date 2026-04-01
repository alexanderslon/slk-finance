import { sql } from '@/lib/db'
import { WorkersManager } from '@/components/workers-manager'

async function getWorkers() {
  return await sql`SELECT * FROM workers ORDER BY created_at DESC`
}

export default async function WorkersPage() {
  const workers = await getWorkers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Работники</h1>
        <p className="text-muted-foreground">Управление сотрудниками</p>
      </div>

      <WorkersManager initialWorkers={workers} />
    </div>
  )
}
