import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { useMediaQuery } from "@/hooks/use-media-query";
import { formatDate, formatMoney } from "@/lib/format";
import { moneyToNumber } from "@/lib/money";
import type { Currency, DailyPoint } from "@/types/api";

import { ChartTooltipCard } from "./chart-parts";
import { useChartTheme } from "./use-chart-theme";

interface Datum {
  day: number;
  expense: number;
  point: DailyPoint;
}

/** Single series (expenses per day): the card title names it, so no legend box. */
export function DailyExpensesChart({
  items,
  currency,
}: {
  items: DailyPoint[];
  currency: Currency;
}) {
  const theme = useChartTheme();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data: Datum[] = items.map((point) => ({
    day: Number(point.date.slice(8, 10)),
    expense: moneyToNumber(point.expense),
    point,
  }));

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const datum = payload?.[0]?.payload as Datum | undefined;
    if (!active || !datum) return null;
    return (
      <ChartTooltipCard
        title={formatDate(datum.point.date, "long")}
        rows={[
          {
            label: "Gastos",
            value: formatMoney(datum.point.expense, currency),
            color: theme.expense,
          },
          { label: "Ingresos", value: formatMoney(datum.point.income, currency) },
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
          tick={{ fill: theme.axis, fontSize: 12 }}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: theme.axis, fontSize: 12 }}
          tickFormatter={(value: number) => formatMoney(String(value), currency, { compact: true })}
          width={64}
        />
        <Tooltip content={renderTooltip} cursor={{ fill: theme.muted, opacity: 0.6 }} />
        <Bar
          dataKey="expense"
          name="Gastos"
          fill={theme.expense}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={!reducedMotion}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyExpensesTable({
  items,
  currency,
}: {
  items: DailyPoint[];
  currency: Currency;
}) {
  const rows = items.filter(
    (point) => moneyToNumber(point.expense) > 0 || moneyToNumber(point.income) > 0,
  );
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Ingresos y gastos por día</caption>
      <thead className="sticky top-0 bg-card">
        <tr className="border-b text-xs text-muted-foreground">
          <th scope="col" className="px-3 py-2 text-left font-medium">
            Día
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            Gastos
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            Ingresos
          </th>
        </tr>
      </thead>
      <tbody className="tabular">
        {rows.map((point) => (
          <tr key={point.date} className="border-b last:border-0">
            <th scope="row" className="px-3 py-2 text-left font-normal">
              {formatDate(point.date)}
            </th>
            <td className="px-3 py-2 text-right">{formatMoney(point.expense, currency)}</td>
            <td className="px-3 py-2 text-right">{formatMoney(point.income, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
