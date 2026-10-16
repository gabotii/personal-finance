import { Delta } from "@/components/delta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatMonth } from "@/lib/format";
import { shiftMonth } from "@/lib/dates";
import type { DashboardSummary, MetricComparison } from "@/types/api";

interface Row {
  label: string;
  metric: MetricComparison;
  upIsGood: boolean;
}

/** Current vs previous month: two numbers per metric, so a compact table beats a chart. */
export function MonthComparisonCard({ summary }: { summary: DashboardSummary }) {
  const previousMonth = shiftMonth(summary.month, -1);
  const rows: Row[] = [
    { label: "Ingresos", metric: summary.comparison.income, upIsGood: true },
    { label: "Gastos", metric: summary.comparison.expense, upIsGood: false },
    { label: "Balance", metric: summary.comparison.net, upIsGood: true },
  ];

  return (
    <Card className="flex min-w-0 flex-col">
      <CardHeader>
        <CardTitle>Comparación mensual</CardTitle>
        <CardDescription>
          {formatMonth(summary.month)} vs {formatMonth(previousMonth)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="divide-y">
          {rows.map(({ label, metric, upIsGood }) => (
            <li key={label} className="grid gap-1.5 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{label}</span>
                <span className="tabular text-sm font-semibold">
                  {formatMoney(metric.current, summary.currency)}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Antes:{" "}
                  <span className="tabular">{formatMoney(metric.previous, summary.currency)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular">
                    {formatMoney(metric.difference, summary.currency, { signDisplay: "always" })}
                  </span>
                  <Delta value={metric.difference_pct} upIsGood={upIsGood} suffix="" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function MonthComparisonSkeleton() {
  return (
    <Card className="space-y-5 p-6">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </Card>
  );
}
