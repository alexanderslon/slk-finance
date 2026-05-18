import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTransactionDateRu, transactionMonthTitleRu } from '@/lib/transaction-dates'
import {
  totalsFromWorkerPayouts,
  workerPayoutKind,
  workerPayoutKindLabel,
  type WorkerPayoutTx,
} from '@/lib/worker-payouts'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

function PayoutSummary({
  title,
  totals,
}: {
  title: string
  totals: ReturnType<typeof totalsFromWorkerPayouts>
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-destructive sm:text-3xl">
        −{formatCurrency(totals.total)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Аванс</p>
          <p className="font-semibold tabular-nums text-destructive">−{formatCurrency(totals.advance)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Зарплата</p>
          <p className="font-semibold tabular-nums text-destructive">−{formatCurrency(totals.salary)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Премия</p>
          <p className="font-semibold tabular-nums text-destructive">−{formatCurrency(totals.bonus)}</p>
        </div>
        {totals.other > 0 ? (
          <div>
            <p className="text-muted-foreground">Прочее</p>
            <p className="font-semibold tabular-nums text-destructive">−{formatCurrency(totals.other)}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PayoutRowMobile({ r }: { r: WorkerPayoutTx }) {
  const kind = workerPayoutKind(r.category_name)
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{formatTransactionDateRu(r.created_at)}</p>
          <p className="text-xs text-muted-foreground">
            {workerPayoutKindLabel(kind)}
            {r.category_name ? ` · ${r.category_name}` : ''}
          </p>
          {r.wallet_name ? (
            <p className="mt-1 text-xs text-muted-foreground">Кошелёк: {r.wallet_name}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
          −{formatCurrency(Number(r.amount) || 0)}
        </span>
      </div>
      {r.description ? (
        <p className="mt-2 wrap-break-word text-xs text-muted-foreground">{r.description}</p>
      ) : null}
    </div>
  )
}

function PayoutTable({
  rows,
  showMonthColumn,
}: {
  rows: WorkerPayoutTx[]
  showMonthColumn: boolean
}) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <PayoutRowMobile key={r.id} r={r} />
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {showMonthColumn ? <TableHead>Месяц</TableHead> : null}
              <TableHead className="w-28">Дата</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Кошелёк</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="text-right tabular-nums">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const kind = workerPayoutKind(r.category_name)
              const ym =
                typeof r.created_at === 'string'
                  ? r.created_at.slice(0, 7)
                  : `${r.created_at.getUTCFullYear()}-${String(r.created_at.getUTCMonth() + 1).padStart(2, '0')}`
              return (
                <TableRow key={r.id}>
                  {showMonthColumn ? (
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {transactionMonthTitleRu(ym)}
                    </TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatTransactionDateRu(r.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{workerPayoutKindLabel(kind)}</TableCell>
                  <TableCell>{r.category_name ?? '—'}</TableCell>
                  <TableCell>{r.wallet_name ?? '—'}</TableCell>
                  <TableCell className="max-w-[280px] wrap-break-word text-muted-foreground">
                    {r.description?.trim() || '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-destructive">
                    −{formatCurrency(Number(r.amount) || 0)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

export function WorkerPayoutsView({
  rows,
  periodLabel,
  summaryTitle,
  showMonthColumn = false,
  monthlyBreakdown,
}: {
  rows: WorkerPayoutTx[]
  periodLabel: string
  summaryTitle: string
  showMonthColumn?: boolean
  monthlyBreakdown?: Array<{
    ym: string
    advance: number
    salary: number
    bonus: number
    total: number
  }>
}) {
  const totals = totalsFromWorkerPayouts(rows)

  return (
    <Card className="rounded-3xl border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">Выплаты</CardTitle>
          <span className="text-sm tabular-nums text-muted-foreground">{periodLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 overflow-x-hidden">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">За выбранный период выплат нет.</p>
        ) : (
          <>
            <PayoutSummary title={summaryTitle} totals={totals} />
            <PayoutTable rows={rows} showMonthColumn={showMonthColumn} />
          </>
        )}

        {monthlyBreakdown && monthlyBreakdown.length > 0 ? (
          <div className="border-t border-border pt-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground">По месяцам</h3>
            <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Месяц</TableHead>
                    <TableHead className="text-right tabular-nums">Аванс</TableHead>
                    <TableHead className="text-right tabular-nums">Зарплата</TableHead>
                    <TableHead className="text-right tabular-nums">Премия</TableHead>
                    <TableHead className="text-right tabular-nums">Итого</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyBreakdown.map((m) => (
                    <TableRow key={m.ym}>
                      <TableCell className="font-medium">{transactionMonthTitleRu(m.ym)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{formatCurrency(Number(m.advance) || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{formatCurrency(Number(m.salary) || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        −{formatCurrency(Number(m.bonus) || 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-destructive">
                        −{formatCurrency(Number(m.total) || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
