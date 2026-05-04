import type { RowData, SmetaStage, SmetaVariantId } from '@/lib/smeta-types'
import { SMETA_INITIAL_ROWS } from '@/lib/smeta-types'

/** Названия для UI (селектор). */
export const SMETA_VARIANT_OPTIONS: ReadonlyArray<{ id: SmetaVariantId; label: string }> = [
  {
    id: 'construction',
    label: 'Строительно-ремонтные работы',
  },
  {
    id: 'shower-enclosure',
    label: 'Установка душевых ограждений',
  },
  {
    id: 'cctv',
    label: 'Подбор и монтаж видеонаблюдения',
  },
]

/** Заголовок в печати / предпросмотре (как в документе). */
export function smetaVariantPrintTitle(variant: SmetaVariantId): string {
  switch (variant) {
    case 'construction':
      return 'СМЕТА НА СТРОИТЕЛЬНО-РЕМОНТНЫЕ РАБОТЫ'
    case 'shower-enclosure':
      return 'СМЕТА НА УСТАНОВКУ ДУШЕВЫХ ОГРАЖДЕНИЙ'
    case 'cctv':
      return 'СМЕТА НА ПОДБОР И МОНТАЖ ВИДЕОНАБЛЮДЕНИЯ'
    default:
      return 'СМЕТА'
  }
}

export function normalizeSmetaVariant(v: unknown): SmetaVariantId {
  if (v === 'shower-enclosure') return 'shower-enclosure'
  if (v === 'cctv') return 'cctv'
  return 'construction'
}

function tr(
  id: number,
  stage: SmetaStage,
  name: string,
  unit: string,
  quantity: number,
  workerPrice: number,
  upperPrice: number,
): RowData {
  return { id, stage, name, unit, quantity, workerPrice, upperPrice, column1: '' }
}

function showerRows(): RowData[] {
  let i = 1
  return [
    tr(i++, 1, 'Консультация и выезд на замер', 'услуга', 1, 0, 2500),
    tr(i++, 1, 'Подбор душевого ограждения (модель, размер, тип стекла)', 'услуга', 1, 0, 0),
    tr(i++, 1, 'Доставка ограждения на объект', 'рейс', 1, 1500, 3500),
    tr(
      i++,
      1,
      'Монтаж душевого ограждения (сборка, крепление, герметизация швов)',
      'компл.',
      1,
      4500,
      12000,
    ),
    tr(i++, 1, 'Подрезка / доработка профиля или стекла при нетиповом проёме', 'компл.', 1, 800, 3500),
    tr(i++, 1, 'Демонтаж старой шторки / ограничителя (при необходимости)', 'компл.', 1, 500, 2000),
    tr(i++, 1, 'Вывоз упаковочных материалов', 'компл.', 1, 0, 500),
  ]
}

function cctvRows(): RowData[] {
  let i = 1
  return [
    tr(i++, 1, 'Консультация и подбор оборудования под задачу', 'услуга', 1, 0, 0),
    tr(i++, 1, 'Монтаж стоек, коробов, подготовка мест под крепление', 'компл.', 1, 2000, 4500),
    tr(i++, 1, 'Прокладка кабеля (в гофре / кабель-канале)', 'м.п.', 40, 120, 280),
    tr(i++, 1, 'Установка IP-камеры (с креплением и ориентацией)', 'шт.', 4, 1500, 4500),
    tr(i++, 1, 'Монтаж и базовая настройка видеорегистратора / NVR', 'компл.', 1, 2500, 6500),
    tr(
      i++,
      1,
      'Настройка сети, удалённого доступа и мобильного приложения',
      'компл.',
      1,
      1500,
      4000,
    ),
    tr(i++, 1, 'Пусконаладка и инструктаж заказчика', 'услуга', 1, 0, 2500),
  ]
}

/** Типовые позиции для варианта (для «Новая смета» и подстановки из селектора). */
export function smetaTemplateRows(variant: SmetaVariantId): RowData[] {
  if (variant === 'construction') {
    return SMETA_INITIAL_ROWS.map((r) => ({ ...r }))
  }
  if (variant === 'shower-enclosure') {
    return showerRows().map((r) => ({ ...r }))
  }
  return cctvRows().map((r) => ({ ...r }))
}

/** Одна «пустая» строка — не считаем содержимое заданным. */
export function rowsLookEditedForVariantSwitch(rows: readonly RowData[]): boolean {
  if (rows.length > 1) return true
  if (rows.length === 0) return false
  const r = rows[0]
  if (typeof r?.name === 'string' && r.name.trim() !== '') return true
  if (Number(r?.upperPrice) > 0 || Number(r?.workerPrice) > 0) return true
  if (Number(r?.quantity) !== 1) return true
  if (String(r?.unit ?? '') !== 'шт.') return true
  return false
}
