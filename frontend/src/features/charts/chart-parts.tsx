import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface LegendItem {
  label: string;
  color: string;
  shape?: "bar" | "line";
}

/** HTML legend above the plot: identity is never left to colour-matching alone. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn(
              "inline-block shrink-0",
              item.shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-[3px]",
            )}
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export interface TooltipRow {
  label: string;
  value: ReactNode;
  color?: string;
  shape?: "bar" | "line";
}

/** Tooltip body shared by every chart. Values use text tokens, swatches carry identity. */
export function ChartTooltipCard({ title, rows }: { title: ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="min-w-[11rem] rounded-lg border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1.5 font-medium">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block shrink-0",
                    row.shape === "line" ? "h-0.5 w-3 rounded-full" : "size-2 rounded-[2px]",
                  )}
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="tabular font-medium">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
