/** Состояние калькулятора смет (construction app). */

/** 1–4 — основные этапы, 5 — доп. работы, 6 — материалы. */
export type SmetaStage = 1 | 2 | 3 | 4 | 5 | 6

/** Основные этапы (чекбоксы 1–4). */
export const SMETA_MAIN_STAGES = [1, 2, 3, 4] as const satisfies readonly SmetaStage[]

/** Ключ только для основных этапов (сроки не задаются для 5 и 6). */
export type SmetaMainStageKey = (typeof SMETA_MAIN_STAGES)[number]

/** Срок выполнения работ по этапам 1–4 — свободный текст (даты, календарные дни и т.д.). */
export type SmetaStageDeadlines = Partial<Record<SmetaMainStageKey, string>>

/** Этап «доп. работы». */
export const ADDITIONAL_WORK_STAGE = 5 as const satisfies SmetaStage

/** Этап «материалы». */
export const MATERIALS_STAGE = 6 as const satisfies SmetaStage

/** Порядок этапов в таблице и сортировке строк. */
export const SMETA_STAGE_ORDER: readonly SmetaStage[] = [1, 2, 3, 4, 5, 6]

export interface RowData {
  id: number
  /** Этап работ (разбивка сметы). */
  stage: SmetaStage
  name: string
  unit: string
  quantity: number
  workerPrice: number
  upperPrice: number
  column1: string
}

export interface HeaderData {
  city: string
  address: string
  customerName: string
  customerPhone: string
  squareMeters: string
  documentNumber: string
  date: string
}

export interface DocState {
  header: HeaderData
  rows: RowData[]
  prepayment: string
  laborer: string
  otkat: string
  /** Накладные расходы, % от суммы всех позиций (верхняя колонка). */
  overheadPercent: string
  /** Скидка клиенту, % от суммы «позиции + накладные». Уменьшает итог к оплате. В старых сохранениях может отсутствовать. */
  customerDiscountPercent?: string
  /** Какие этапы участвуют в смете и расчёте (минимум один). Остальные скрыты. В старых сохранениях может отсутствовать — тогда считаются основные этапы 1–4. */
  enabledStages?: SmetaStage[]
  /** Сроки выполнения только для этапов 1–4. */
  stageDeadlines?: SmetaStageDeadlines
}

function row(
  id: number,
  stage: SmetaStage,
  rest: Omit<RowData, 'id' | 'stage'>,
): RowData {
  return { id, stage, ...rest }
}

export const SMETA_INITIAL_ROWS: RowData[] = [
  row(1, 1, { name: 'Монтаж электрического тёплого пола 1 этаж', unit: 'м²', quantity: 10.71, workerPrice: 0, upperPrice: 1200, column1: '' }),
  row(2, 1, { name: 'Монтаж электрического тёплого пола 2 этаж (новое)', unit: 'м²', quantity: 13, workerPrice: 0, upperPrice: 1200, column1: '' }),
  row(3, 1, { name: 'Укладка керамогранита 600×600 на пол 1 этажа (с подрезкой)', unit: 'м²', quantity: 21.3, workerPrice: 2500, upperPrice: 3380, column1: '' }),
  row(4, 1, { name: 'Затирка швов пола (керамогранит)', unit: 'м²', quantity: 21.3, workerPrice: 100, upperPrice: 500, column1: '' }),
  row(5, 1, { name: 'Наливной (самовыравнивающийся) пол 2 этаж', unit: 'м²', quantity: 22.48, workerPrice: 0, upperPrice: 600, column1: '' }),
  row(6, 1, { name: 'Укладка ламината 2 этаж', unit: 'м²', quantity: 22.48, workerPrice: 0, upperPrice: 900, column1: '' }),
  row(7, 1, { name: 'Монтаж плинтуса (под ламинат)', unit: 'м.п.', quantity: 26, workerPrice: 0, upperPrice: 450, column1: '' }),
  row(8, 2, { name: 'Шлифовка стен под покраску (после шпаклёвки)', unit: 'м²', quantity: 108, workerPrice: 200, upperPrice: 300, column1: '' }),
  row(9, 2, { name: 'Локальная доработка шпаклёвки / подмазка', unit: 'м²', quantity: 108, workerPrice: 350, upperPrice: 400, column1: '' }),
  row(10, 2, { name: 'Грунтование стен под покраску', unit: 'м²', quantity: 108, workerPrice: 0, upperPrice: 100, column1: '' }),
  row(11, 2, { name: 'Покраска стен (белый цвет, 2 слоя)', unit: 'м²', quantity: 108, workerPrice: 500, upperPrice: 600, column1: '' }),
  row(12, 2, { name: 'Натяжной потолок (монтаж, белый матовый) — 1+2 этаж', unit: 'м²', quantity: 42.49, workerPrice: 0, upperPrice: 1200, column1: '' }),
  row(13, 2, { name: 'Установка унитаза', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 5000, column1: '' }),
  row(14, 2, { name: 'Установка тумбы с раковиной (подключение)', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 7000, column1: '' }),
  row(15, 3, { name: 'Установка душевого ограждения', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 9500, column1: '' }),
  row(16, 3, { name: 'Установка гигиенического душа (новое)', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 3500, column1: '' }),
  row(17, 3, { name: 'Установка тропического (верхнего) душа (новое)', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 6000, column1: '' }),
  row(18, 3, { name: 'Установка межкомнатной двери в санузел', unit: 'шт.', quantity: 2, workerPrice: 0, upperPrice: 9000, column1: '' }),
  row(19, 3, { name: 'Облицовка лестницы деревянными ступенями (работа)', unit: 'ступ.', quantity: 8, workerPrice: 0, upperPrice: 6000, column1: '' }),
  row(20, 3, { name: 'Установка розеток / выключателей / проходных / бра', unit: 'шт.', quantity: 38, workerPrice: 0, upperPrice: 500, column1: '' }),
  row(21, 4, { name: 'Вывоз строительного мусора (новое)', unit: '—', quantity: 1, workerPrice: 6000, upperPrice: 22000, column1: '' }),
]

/** Одна пустая позиция — «чистая» смета (без демо-наполнения). */
export const SMETA_EMPTY_ROWS: RowData[] = [
  row(1, 1, { name: '', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 0, column1: '' }),
]

export function defaultHeader(): HeaderData {
  return {
    city: 'Москва',
    address: '',
    customerName: '',
    customerPhone: '',
    squareMeters: '',
    documentNumber: 'СМ-001',
    date: new Date().toISOString().slice(0, 10),
  }
}

/** Полностью пустые реквизиты для «голой» сметы. */
export function blankHeader(): HeaderData {
  return {
    city: '',
    address: '',
    customerName: '',
    customerPhone: '',
    squareMeters: '',
    documentNumber: '',
    date: '',
  }
}

export function nextRowIdFromRows(rows: RowData[]): number {
  const max = rows.reduce((m, r) => Math.max(m, r.id), 0)
  return Math.max(100, max) + 1
}

export function normalizeSmetaStage(v: unknown): SmetaStage {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN
  if (n === 2) return 2
  if (n === 3) return 3
  if (n === 4) return 4
  if (n === 5) return 5
  if (n === 6) return 6
  return 1
}

/** Нормализация сроков: оставляем только строки по ключам 1–4. */
export function normalizeStageDeadlines(raw: unknown): SmetaStageDeadlines {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: SmetaStageDeadlines = {}
  for (const st of SMETA_MAIN_STAGES) {
    const v = o[String(st)]
    if (typeof v === 'string') out[st] = v
  }
  return out
}

/** Нормализация списка активных этапов: непустое подмножество {1..6}, порядок фиксированный. */
export function normalizeEnabledStages(raw: unknown): SmetaStage[] {
  if (!raw || !Array.isArray(raw)) return [...SMETA_MAIN_STAGES]
  const picked = new Set<SmetaStage>()
  for (const x of raw) {
    const s = normalizeSmetaStage(x)
    if (SMETA_STAGE_ORDER.includes(s)) picked.add(s)
  }
  if (picked.size === 0) return [1]
  return SMETA_STAGE_ORDER.filter((s) => picked.has(s))
}

/**
 * Подбор `enabledStages` для legacy-смет, у которых поля нет.
 *
 * Раньше всегда возвращали `[1..4]`, и старые сметы со строками этапов 5/6
 * («Доп. работы», «Материалы») открывались с пустыми блоками — пользователь
 * думал, что данные пропали. Теперь смотрим на реальные этапы строк и
 * включаем все, которые там есть.
 */
export function inferEnabledStagesFromRows(rows: readonly RowData[]): SmetaStage[] {
  const present = new Set<SmetaStage>()
  for (const r of rows) {
    present.add(normalizeSmetaStage(r.stage))
  }
  for (const st of SMETA_MAIN_STAGES) present.add(st)
  return SMETA_STAGE_ORDER.filter((s) => present.has(s))
}

export function firstEnabledStage(stages: readonly SmetaStage[]): SmetaStage {
  for (const s of SMETA_STAGE_ORDER) {
    if (stages.includes(s)) return s
  }
  return 1
}

export function stageLabel(st: SmetaStage): string {
  if (st === ADDITIONAL_WORK_STAGE) return 'Доп. работы'
  if (st === MATERIALS_STAGE) return 'Материалы'
  return `Этап ${st}`
}

/** Подпись строки итога по блоку этапа (таблица / печать). */
export function stageSubtotalLabel(st: SmetaStage): string {
  if (st === ADDITIONAL_WORK_STAGE) return 'Итого (доп. работы):'
  if (st === MATERIALS_STAGE) return 'Итого (материалы):'
  return `Итого по этапу ${st}:`
}
