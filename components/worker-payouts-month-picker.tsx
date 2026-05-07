'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { transactionMonthTitleRu } from '@/lib/transaction-dates'

export function WorkerPayoutsMonthPicker({
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
    const uniq = Array.from(new Set(monthOptions))
    return ['all', ...uniq]
  }, [monthOptions])

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

