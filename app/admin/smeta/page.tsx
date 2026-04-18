import { Suspense } from 'react'
import { ConstructionSmetaCalculator } from '@/components/smeta/construction-smeta-calculator'

export default function AdminSmetaPage() {
  return (
    <Suspense
      fallback={<div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Загрузка калькулятора…</div>}
    >
      <ConstructionSmetaCalculator />
    </Suspense>
  )
}
