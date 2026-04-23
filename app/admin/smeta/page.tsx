import { Suspense } from 'react'
import { ConstructionSmetaCalculator } from '@/components/smeta/construction-smeta-calculator'

export default function AdminSmetaPage() {
  return (
    <div className="min-w-0 max-w-full">
      <Suspense
        fallback={
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
            Загрузка калькулятора…
          </div>
        }
      >
        <ConstructionSmetaCalculator />
      </Suspense>
    </div>
  )
}
