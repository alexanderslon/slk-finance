/**
 * Разбор чисел в смете: ввод/вставка из Excel, RU-локаль (пробелы, запятая),
 * европейский формат тысяч `12.345,67`, целые тысячи через точку `12.345`.
 */
export function parseSmetaNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string') return 0

  let s = v.replace(/\u00A0/g, '').replace(/\s+/g, '').trim()
  if (!s) return 0

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      // 1.234.567,89 — точки как тысячи, запятая — десятичная
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,234,567.89 — запятые как тысячи
      s = s.replace(/,/g, '')
    }
  } else if (lastComma >= 0) {
    const parts = s.split(',')
    if (
      parts.length === 2 &&
      parts[1].length > 0 &&
      parts[1].length <= 2 &&
      /^\d+$/.test(parts[0].replace(/\./g, '')) &&
      /^\d+$/.test(parts[1])
    ) {
      s = parts[0].replace(/\./g, '') + '.' + parts[1]
    } else {
      s = parts.join('').replace(/\./g, '')
    }
  } else if (lastDot >= 0) {
    const parts = s.split('.')
    if (parts.length > 2) {
      const last = parts[parts.length - 1]!
      if (last.length <= 2 && /^\d+$/.test(last)) {
        s = parts.slice(0, -1).join('') + '.' + last
      } else {
        s = parts.join('')
      }
    } else if (parts.length === 2) {
      const a = parts[0]!
      const b = parts[1]!
      // «12.345» как 12 345 (целые тысячи); «0.005» и «10.71» оставляем десятичными
      if (b.length === 3 && /^\d+$/.test(b) && /^\d+$/.test(a) && a !== '0') {
        s = a + b
      }
    }
  }

  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
