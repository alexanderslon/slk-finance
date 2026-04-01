/** Маска ввода: +7 (XXX) XXX-XX-XX, только цифры с телефона. */

export function formatRuPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1)
  }
  if (digits.length > 0 && digits[0] !== '7' && digits[0] === '9') {
    digits = '7' + digits
  }
  digits = digits.slice(0, 11)

  if (digits.length === 0) return ''

  const body = digits.slice(1)
  let s = '+7'

  if (body.length === 0) return `${s} (`

  s += ' (' + body.slice(0, Math.min(3, body.length))
  if (body.length <= 3) {
    return body.length === 3 ? `${s}) ` : s
  }

  s += ') ' + body.slice(3, Math.min(6, body.length))
  if (body.length <= 6) {
    return s
  }

  s += '-' + body.slice(6, Math.min(8, body.length))
  if (body.length <= 8) {
    return s
  }

  s += '-' + body.slice(8, 10)
  return s
}

export function ruPhoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

export function isCompleteRuMobile(digits: string): boolean {
  return digits.length === 11 && digits.startsWith('7')
}

/** Красивый вывод сохранённого номера (в т.ч. старые записи без маски). */
export function formatCustomerPhoneDisplay(stored: string | null | undefined): string {
  if (!stored) return ''
  const d = ruPhoneDigits(stored)
  if (d.length === 11) return formatRuPhoneInput(d)
  return stored.trim()
}
