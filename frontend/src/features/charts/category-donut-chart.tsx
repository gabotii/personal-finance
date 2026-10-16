import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";

import { CategoryIcon } from "@/components/category-icon";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatMoney, formatPercent } from "@/lib/format";
import { moneyToNumber } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CategoryBreakdown, CategoryBreakdownItem } from "@/types/api";

import { ChartTooltipCard } from "./chart-parts";
import { useChartTheme } from "./use-chart-theme";

interface Datum {
  name: string;
  value: number;
  item: CategoryBreakdownItem;
}

interface CategoryDonutProps {
  breakdown: CategoryBreakdown;
  totalLabel: string;
  className?: string;
}

/**
 * Donut + value list. Slices use each category's own colour (identity follows the entity
 * everywhere in the app); the list beside it names every slice with amount and share, so
 * no reader depends on matching colours.
 */
export function CategoryDonut({ breakdown, totalLabel, className }: CategoryDonutProps) {
  const theme = useChartTheme();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data: Datum[] = breakdown.items.map((item) => ({
    name: item.name,
    value: moneyToNumber(item.total),
    item,
  }));

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const datum = payload?.[0]?.payload as Datum | undefined;
    if (!active || !datum) return null;
    return (
      <ChartTooltipCard
        title={datum.item.name}
        rows={[
          {
            label: "Total",
            value: formatMoney(datum.item.total, breakdown.currency),
            color: datum.item.color,
          },
          { label: "Participación", value: formatPercent(datum.item.percentage) },
          { label: "Movimientos", value: datum.item.transaction_count },
        ]}
      />
    );
  };

  return (
    <div className={cn("grid items-center gap-6 sm:grid-cols-[minmax(0,200px)_1fr]", className)}>
      <div className="relative mx-auto aspect-square w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="96%"
              stroke={theme.surface}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={!reducedMotion}
            >
              {data.map((datum) => (
                <Cell key={datum.item.category_id} fill={datum.item.color} />
              ))}
            </Pie>
            <Tooltip content={renderTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">{totalLabel}</span>
          <span className="max-w-[70%] truncate text-base font-semibold tracking-tight">
            {formatMoney(breakdown.total, breakdown.currency, { compact: true })}
          </span>
        </div>
      </div>

      <ul className="min-w-0 space-y-2.5" aria-label="Detalle por categoría">
        {breakdown.items.map((item) => (
          <li key={item.category_id} className="flex items-center gap-3 text-sm">
            <CategoryIcon icon={item.icon} color={item.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate">{item.name}</span>
                <span className="tabular shrink-0 font-medium">
                  {formatMoney(item.total, breakdown.currency)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.min(100, moneyToNumber(item.percentage)))}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="tabular w-12 shrink-0 text-right text-xs text-muted-foreground">
                  {formatPercent(item.percentage)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
