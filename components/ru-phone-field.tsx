'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { formatRuPhoneInput } from '@/lib/phone-format'
import { cn } from '@/lib/utils'

type RuPhoneFieldProps = {
  id?: string
  /** Имя для отправки формы (дублируется скрытым полем с отформатированным значением). */
  name?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  required?: boolean
}

/**
 * Поле телефона РФ с маской +7 (___) ___-__-__
 */
export function RuPhoneField({
  id,
  name,
  value,
  onChange,
  disabled,
  className,
  required,
}: RuPhoneFieldProps) {
  return (
    <>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="+7 (999) 123-45-67"
        value={value}
        disabled={disabled}
        required={required}
        className={cn('font-mono text-base tracking-tight tabular-nums', className)}
        onChange={(e) => {
          onChange(formatRuPhoneInput(e.target.value))
        }}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text') || ''
          onChange(formatRuPhoneInput(text))
        }}
      />
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
    </>
  )
}
