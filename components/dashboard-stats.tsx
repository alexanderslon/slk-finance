import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard } from 'lucide-react'

type Stats = {
  totalBalance: number
  totalIncome: number
  totalExpenses: number
  totalDebtGiven: number
  totalDebtTaken: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Общий баланс
          </CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Доходы (месяц)
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalIncome)}</div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Расходы (месяц)
          </CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalExpenses)}</div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Долги
          </CardTitle>
          <CreditCard className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Дал: </span>
              <span className="font-medium text-success">{formatCurrency(stats.totalDebtGiven)}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Взял: </span>
              <span className="font-medium text-destructive">{formatCurrency(stats.totalDebtTaken)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
