import type { DocState, HeaderData, RowData, SmetaStage } from '@/lib/smeta-types'

export type SmetaFinanceTotals = {
  /** Сумма по позициям (без накладных). */
  worksSubtotal: number
  overheadAmount: number
  overheadPercent: number
  totalUpperSum: number
  totalWorkerSum: number
  prepaymentN: number
  laborerN: number
  otkatN: number
  totalExpenses: number
  myIncome: number
  toPay: number
}

/** Тело для POST/PUT /api/smeta (расширенный формат + колонки для списков/отчётов). */
export function buildSmetaPersistBody(
  header: HeaderData,
  rows: RowData[],
  prepayment: string,
  laborer: string,
  otkat: string,
  overheadPercent: string,
  enabledStages: SmetaStage[],
  totals: SmetaFinanceTotals,
): Record<string, unknown> {
  const sq = header.squareMeters.replace(/\s/g, '').replace(',', '.')
  const square_meters = parseFloat(sq)
  return {
    title: [header.documentNumber?.trim(), header.customerName?.trim()].filter(Boolean).join(' · ') || 'Смета',
    document_number: header.documentNumber ?? '',
    customer_name: header.customerName ?? '',
    address: header.address ?? '',
    phone: header.customerPhone ?? '',
    square_meters: Number.isFinite(square_meters) ? square_meters : null,
    total_amount: totals.totalUpperSum,
    prepayment: totals.prepaymentN,
    data: {
      header,
      rows,
      prepayment,
      laborer,
      otkat,
      overheadPercent,
      enabledStages,
      finance: totals,
    },
  }
}
