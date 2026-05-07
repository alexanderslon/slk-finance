'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
    <select
      className="h-10 w-[min(100%,280px)] rounded-md border border-input bg-white px-3 text-sm outline-none"
      value={value}
      onChange={(e) => {
        const next = e.target.value
        const sp = new URLSearchParams(searchParams.toString())
        if (next === 'all') sp.delete('month')
        else sp.set('month', next)
        const q = sp.toString()
        router.push(q ? `${pathname}?${q}` : pathname)
        router.refresh()
      }}
    >
      <option value="all">За всё время</option>
      {options
        .filter((o) => o !== 'all')
        .map((ym) => (
          <option key={ym} value={ym}>
            {transactionMonthTitleRu(ym)}
          </option>
        ))}
    </select>
  )
}

