/** Состояние калькулятора смет (construction app). */

export interface RowData {
  id: number
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
}

export const SMETA_INITIAL_ROWS: RowData[] = [
  { id: 1, name: 'Монтаж электрического тёплого пола 1 этаж', unit: 'м²', quantity: 10.71, workerPrice: 0, upperPrice: 1200, column1: '' },
  { id: 2, name: 'Монтаж электрического тёплого пола 2 этаж (новое)', unit: 'м²', quantity: 13, workerPrice: 0, upperPrice: 1200, column1: '' },
  { id: 3, name: 'Укладка керамогранита 600×600 на пол 1 этажа (с подрезкой)', unit: 'м²', quantity: 21.3, workerPrice: 2500, upperPrice: 3380, column1: '' },
  { id: 4, name: 'Затирка швов пола (керамогранит)', unit: 'м²', quantity: 21.3, workerPrice: 100, upperPrice: 500, column1: '' },
  { id: 5, name: 'Наливной (самовыравнивающийся) пол 2 этаж', unit: 'м²', quantity: 22.48, workerPrice: 0, upperPrice: 600, column1: '' },
  { id: 6, name: 'Укладка ламината 2 этаж', unit: 'м²', quantity: 22.48, workerPrice: 0, upperPrice: 900, column1: '' },
  { id: 7, name: 'Монтаж плинтуса (под ламинат)', unit: 'м.п.', quantity: 26, workerPrice: 0, upperPrice: 450, column1: '' },
  { id: 8, name: 'Шлифовка стен под покраску (после шпаклёвки)', unit: 'м²', quantity: 108, workerPrice: 200, upperPrice: 300, column1: '' },
  { id: 9, name: 'Локальная доработка шпаклёвки / подмазка', unit: 'м²', quantity: 108, workerPrice: 350, upperPrice: 400, column1: '' },
  { id: 10, name: 'Грунтование стен под покраску', unit: 'м²', quantity: 108, workerPrice: 0, upperPrice: 100, column1: '' },
  { id: 11, name: 'Покраска стен (белый цвет, 2 слоя)', unit: 'м²', quantity: 108, workerPrice: 500, upperPrice: 600, column1: '' },
  { id: 12, name: 'Натяжной потолок (монтаж, белый матовый) — 1+2 этаж', unit: 'м²', quantity: 42.49, workerPrice: 0, upperPrice: 1200, column1: '' },
  { id: 13, name: 'Установка унитаза', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 5000, column1: '' },
  { id: 14, name: 'Установка тумбы с раковиной (подключение)', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 7000, column1: '' },
  { id: 15, name: 'Установка душевого ограждения', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 9500, column1: '' },
  { id: 16, name: 'Установка гигиенического душа (новое)', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 3500, column1: '' },
  { id: 17, name: 'Установка тропического (верхнего) душа (новое)', unit: 'шт.', quantity: 1, workerPrice: 0, upperPrice: 6000, column1: '' },
  { id: 18, name: 'Установка межкомнатной двери в санузел', unit: 'шт.', quantity: 2, workerPrice: 0, upperPrice: 9000, column1: '' },
  { id: 19, name: 'Облицовка лестницы деревянными ступенями (работа)', unit: 'ступ.', quantity: 8, workerPrice: 0, upperPrice: 6000, column1: '' },
  { id: 20, name: 'Установка розеток / выключателей / проходных / бра', unit: 'шт.', quantity: 38, workerPrice: 0, upperPrice: 500, column1: '' },
  { id: 21, name: 'Вывоз строительного мусора (новое)', unit: '—', quantity: 1, workerPrice: 6000, upperPrice: 22000, column1: '' },
  { id: 22, name: 'Накладные расходы', unit: '', quantity: 1, workerPrice: 0, upperPrice: 38000, column1: '' },
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

export function nextRowIdFromRows(rows: RowData[]): number {
  const max = rows.reduce((m, r) => Math.max(m, r.id), 0)
  return Math.max(100, max) + 1
}
