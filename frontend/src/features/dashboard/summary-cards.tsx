import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";

import { CurrencyDisplay } from "@/components/currency-display";
import { Delta } from "@/components/delta";
import { StatCard, StatCardSkeleton } from "@/components/stat-card";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/types/api";

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}

function savingsRateChange(summary: DashboardSummary): string | null {
  const { current, previous } = summary;
  if (current.savings_rate === null || previous.savings_rate === null) return null;
  // Percentage-point difference of two backend-computed rates, display only.
  const points = Number(current.savings_rate) - Number(previous.savings_rate);
  return points.toFixed(2);
}

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const { currency, current, comparison } = summary;
  const rateChange = savingsRateChange(summary);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Balance"
        icon={Wallet}
        emphasis
        value={
          <CurrencyDisplay
            value={summary.balance}
            currency={currency}
            className={cn(summary.balance.startsWith("-") && "text-negative")}
          />
        }
        footer={
          <Delta value={summary.balance_change_pct} upIsGood suffix="vs cierre del mes anterior" />
        }
      />
      <StatCard
        label="Ingresos del mes"
        icon={ArrowUpRight}
        value={<CurrencyDisplay value={current.income} currency={currency} />}
        footer={<Delta value={comparison.income.difference_pct} upIsGood />}
      />
      <StatCard
        label="Gastos del mes"
        icon={ArrowDownRight}
        value={<CurrencyDisplay value={current.expense} currency={currency} />}
        footer={<Delta value={comparison.expense.difference_pct} upIsGood={false} />}
      />
      <StatCard
        label="Tasa de ahorro"
        icon={PiggyBank}
        value={current.savings_rate === null ? "—" : formatPercent(current.savings_rate)}
        footer={
          current.savings_rate === null ? (
            <span className="text-xs text-muted-foreground">
              Registra ingresos este mes para calcularla
            </span>
          ) : rateChange === null ? (
            <span className="text-xs text-muted-foreground">Del total de ingresos del mes</span>
          ) : (
            <Delta value={rateChange} upIsGood suffix="pts vs mes anterior" percent={false} />
          )
        }
      />
    </div>
  );
}
