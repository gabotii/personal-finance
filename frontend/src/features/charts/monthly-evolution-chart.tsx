import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { useMediaQuery } from "@/hooks/use-media-query";
import { formatMoney, formatMonth } from "@/lib/format";
import { moneyToNumber } from "@/lib/money";
import type { Currency, MonthlyPoint } from "@/types/api";

import { ChartLegend, ChartTooltipCard } from "./chart-parts";
import { useChartTheme } from "./use-chart-theme";

interface Datum {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  point: MonthlyPoint;
}

export function MonthlyEvolutionLegend() {
  const theme = useChartTheme();
  return (
    <ChartLegend
      items={[
        { label: "Ingresos", color: theme.income },
        { label: "Gastos", color: theme.expense },
        { label: "Balance del mes", color: theme.net, shape: "line" },
      ]}
    />
  );
}

/**
 * Income and expense columns plus the month's net balance as a line, on ONE shared
 * money axis (all three are amounts in the same currency).
 */
export function MonthlyEvolutionChart({
  items,
  currency,
}: {
  items: MonthlyPoint[];
  currency: Currency;
}) {
  const theme = useChartTheme();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data: Datum[] = items.map((point) => ({
    month: point.month,
    label: formatMonth(point.month, "short"),
    income: moneyToNumber(point.income),
    expense: moneyToNumber(point.expense),
    net: moneyToNumber(point.net),
    point,
  }));
  const hasNegative = data.some((datum) => datum.net < 0);

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const datum = payload?.[0]?.payload as Datum | undefined;
    if (!active || !datum) return null;
    return (
      <ChartTooltipCard
        title={formatMonth(datum.month)}
        rows={[
          {
            label: "Ingresos",
            value: formatMoney(datum.point.income, currency),
            color: theme.income,
          },
          {
            label: "Gastos",
            value: formatMoney(datum.point.expense, currency),
            color: theme.expense,
          },
          {
            label: "Balance del mes",
            value: formatMoney(datum.point.net, currency, { signDisplay: "always" }),
            color: theme.net,
            shape: "line",
          },
          { label: "Saldo acumulado", value: formatMoney(datum.point.balance, currency) },
        ]}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        barGap={2}
        barCategoryGap="24%"
      >
        <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: theme.axis, fontSize: 12 }}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: theme.axis, fontSize: 12 }}
          tickFormatter={(value: number) => formatMoney(String(value), currency, { compact: true })}
          width={64}
        />
        {hasNegative && <ReferenceLine y={0} stroke={theme.axis} strokeWidth={1} />}
        <Tooltip content={renderTooltip} cursor={{ fill: theme.muted, opacity: 0.6 }} />
        <Bar
          dataKey="income"
          name="Ingresos"
          fill={theme.income}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={!reducedMotion}
        />
        <Bar
          dataKey="expense"
          name="Gastos"
          fill={theme.expense}
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={!reducedMotion}
        />
        <Line
          dataKey="net"
          name="Balance del mes"
          type="monotone"
          stroke={theme.net}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: theme.net, stroke: theme.surface, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: theme.net, stroke: theme.surface, strokeWidth: 2 }}
          isAnimationActive={!reducedMotion}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MonthlyEvolutionTable({
  items,
  currency,
}: {
  items: MonthlyPoint[];
  currency: Currency;
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Evolución mensual de ingresos, gastos y balance</caption>
      <thead className="sticky top-0 bg-card">
        <tr className="border-b text-xs text-muted-foreground">
          <th scope="col" className="px-3 py-2 text-left font-medium">
            Mes
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            Ingresos
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            Gastos
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            Balance
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            Acumulado
          </th>
        </tr>
      </thead>
      <tbody className="tabular">
        {items.map((point) => (
          <tr key={point.month} className="border-b last:border-0">
            <th scope="row" className="px-3 py-2 text-left font-normal">
              {formatMonth(point.month)}
            </th>
            <td className="px-3 py-2 text-right">{formatMoney(point.income, currency)}</td>
            <td className="px-3 py-2 text-right">{formatMoney(point.expense, currency)}</td>
            <td className="px-3 py-2 text-right">
              {formatMoney(point.net, currency, { signDisplay: "always" })}
            </td>
            <td className="px-3 py-2 text-right">{formatMoney(point.balance, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
