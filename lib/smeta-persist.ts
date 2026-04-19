import type { DocState } from '@/lib/smeta-types'

/** Единый JSON в колонках payload и data (совместимость со старыми клиентами). */
export type StoredEstimateJson = DocState & {
  finance?: Record<string, unknown>
}

export function mergeStoredPayload(data: unknown, payload: unknown): unknown {
  if (data !== undefined && data !== null) return data
  return payload
}

export function deriveTitleFromStored(merged: unknown): string {
  if (!merged || typeof merged !== 'object') return 'Смета'
  const o = merged as Record<string, unknown>
  const h = o.header
  if (h && typeof h === 'object') {
    const header = h as Record<string, unknown>
    const num = typeof header.documentNumber === 'string' ? header.documentNumber.trim() : ''
    const name = typeof header.customerName === 'string' ? header.customerName.trim() : ''
    const parts = [num, name].filter(Boolean)
    if (parts.length) return parts.join(' · ')
  }
  return 'Смета'
}
