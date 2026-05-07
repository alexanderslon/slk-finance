'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { transactionMonthTitleRu } from '@/lib/transaction-dates'

export function WorkersMonthPicker({
  monthOptions,
  value,
}: {
  monthOptions: string[]
  value: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const options = useMemo(() => {
    const base = Array.from(new Set(monthOptions))
    const withValue = value && value !== 'all' && !base.includes(value) ? [value, ...base] : base
    return ['all', ...withValue]
  }, [monthOptions, value])

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const sp = new URLSearchParams(searchParams.toString())
        if (next === 'all') sp.delete('month')
        else sp.set('month', next)
        const q = sp.toString()
        router.push(q ? `${pathname}?${q}` : pathname)
        router.refresh()
      }}
    >
      <SelectTrigger className="h-10 w-[min(100%,280px)] border-border bg-card text-foreground shadow-none">
        <SelectValue placeholder="Месяц" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">За всё время</SelectItem>
        {options
          .filter((o) => o !== 'all')
          .map((ym) => (
            <SelectItem key={ym} value={ym}>
              {transactionMonthTitleRu(ym)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}

