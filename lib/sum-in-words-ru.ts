/**
 * Сумма прописью на русском (рубли + копейки) с правильными окончаниями.
 *
 * Пример:
 *   sumInWordsRu(1234567.89)
 *   // "один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь рублей 89 копеек"
 */

const UNITS_MASCULINE = [
  'ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
] as const

const UNITS_FEMININE = [
  'ноль', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
] as const

const TEENS = [
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
  'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать',
] as const

const TENS = [
  '', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят',
  'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто',
] as const

const HUNDREDS = [
  '', 'сто', 'двести', 'триста', 'четыреста',
  'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот',
] as const

type Gender = 'm' | 'f'

function tripletToWords(num: number, gender: Gender): string {
  const out: string[] = []
  const h = Math.floor(num / 100)
  const rest = num % 100
  if (h > 0) out.push(HUNDREDS[h])
  if (rest >= 10 && rest < 20) {
    out.push(TEENS[rest - 10])
  } else {
    const t = Math.floor(rest / 10)
    const u = rest % 10
    if (t > 0) out.push(TENS[t])
    if (u > 0) {
      out.push(gender === 'f' ? UNITS_FEMININE[u] : UNITS_MASCULINE[u])
    }
  }
  return out.join(' ')
}

/** Окончание по правилам русского языка для счётной формы (1, 2-4, 5-20). */
function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs >= 11 && abs <= 19) return forms[2]
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}

const RUBLE_FORMS: [string, string, string] = ['рубль', 'рубля', 'рублей']
const KOPEK_FORMS: [string, string, string] = ['копейка', 'копейки', 'копеек']
const THOUSAND_FORMS: [string, string, string] = ['тысяча', 'тысячи', 'тысяч']
const MILLION_FORMS: [string, string, string] = ['миллион', 'миллиона', 'миллионов']
const BILLION_FORMS: [string, string, string] = ['миллиард', 'миллиарда', 'миллиардов']

/** Целая часть числа прописью (без валюты). */
function intToWords(value: number): string {
  if (value === 0) return UNITS_MASCULINE[0]
  if (value < 0) return 'минус ' + intToWords(-value)

  const billions = Math.floor(value / 1_000_000_000)
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((value % 1_000_000) / 1000)
  const remainder = value % 1000

  const parts: string[] = []
  if (billions > 0) {
    parts.push(tripletToWords(billions, 'm'), plural(billions, BILLION_FORMS))
  }
  if (millions > 0) {
    parts.push(tripletToWords(millions, 'm'), plural(millions, MILLION_FORMS))
  }
  if (thousands > 0) {
    parts.push(tripletToWords(thousands, 'f'), plural(thousands, THOUSAND_FORMS))
  }
  if (remainder > 0) {
    parts.push(tripletToWords(remainder, 'm'))
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Сумма прописью + цифровое представление копеек.
 * Округление — банковское до копеек.
 */
export function sumInWordsRu(amount: number): string {
  if (!Number.isFinite(amount)) return ''
  const sign = amount < 0 ? 'минус ' : ''
  const abs = Math.abs(amount)
  const rounded = Math.round(abs * 100) / 100
  const rubles = Math.floor(rounded)
  const kopeks = Math.round((rounded - rubles) * 100)

  const rubWords = intToWords(rubles)
  const rubLabel = plural(rubles, RUBLE_FORMS)
  const kopLabel = plural(kopeks, KOPEK_FORMS)
  const kopText = String(kopeks).padStart(2, '0')

  return capitalize(`${sign}${rubWords} ${rubLabel} ${kopText} ${kopLabel}`)
}
