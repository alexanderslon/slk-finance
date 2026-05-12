import type { RowData } from '@/lib/smeta-types'
import { normalizeSmetaStage } from '@/lib/smeta-types'
import { parseSmetaNumber } from '@/lib/smeta-numbers'

/** Приводит строки из JSON/вставки к числам и нормальному этапу — один источник правды для расчётов. */
export function normalizeDocRows(raw: unknown): RowData[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const r = item as Partial<RowData> & Record<string, unknown>
    const id = typeof r.id === 'number' && Number.isFinite(r.id) ? r.id : Number(r.id)
    return {
      id: Number.isFinite(id) ? id : 0,
      stage: normalizeSmetaStage(r.stage),
      name: typeof r.name === 'string' ? r.name : String(r.name ?? ''),
      unit: typeof r.unit === 'string' ? r.unit : String(r.unit ?? ''),
      quantity: parseSmetaNumber(r.quantity),
      workerPrice: parseSmetaNumber(r.workerPrice),
      upperPrice: parseSmetaNumber(r.upperPrice),
      column1: typeof r.column1 === 'string' ? r.column1 : String(r.column1 ?? ''),
    }
  })
}
