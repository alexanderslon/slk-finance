/**
 * Утилиты для экспорта данных в CSV (RFC 4180), пригодные для Excel/Numbers.
 *
 * - Используем разделитель `;` и BOM (`\uFEFF`) — Excel в русской локали так
 *   сразу определяет колонки и не показывает кракозябры на кириллице.
 * - Поля экранируем по правилам RFC: оборачиваем в кавычки, если содержат
 *   разделитель, перевод строки или сами кавычки; внутренние `"` удваиваем.
 */

const SEPARATOR = ';'
const UTF8_BOM = '\uFEFF'

function escapeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  let value: string
  if (raw instanceof Date) {
    value = Number.isFinite(raw.getTime()) ? raw.toISOString() : ''
  } else if (typeof raw === 'number') {
    value = Number.isFinite(raw) ? String(raw) : ''
  } else if (typeof raw === 'boolean') {
    value = raw ? 'true' : 'false'
  } else {
    value = String(raw)
  }
  // Excel считает значения, начинающиеся с =, +, -, @ формулами и может
  // выполнить их при открытии файла (CSV-инъекция). Префикс `'` нейтрализует.
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`
  if (value.includes('"') || value.includes(SEPARATOR) || value.includes('\n') || value.includes('\r')) {
    value = `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Собрать CSV-текст с BOM из заголовков и строк. */
export function toCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: readonly { key: keyof T & string; label: string; map?: (row: T) => unknown }[],
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(SEPARATOR)
  const body = rows
    .map((row) =>
      columns
        .map((c) => escapeCell(c.map ? c.map(row) : (row as Record<string, unknown>)[c.key]))
        .join(SEPARATOR),
    )
    .join('\r\n')
  return UTF8_BOM + header + '\r\n' + body + '\r\n'
}

/** Сохранить готовую CSV-строку как файл (только в браузере). */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Дата для имени файла: `2026-05-04`. */
export function todayStampForFilename(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
