import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatPercent } from "@/lib/format";
import { isNegative, isZero } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Money } from "@/types/api";

interface DeltaProps {
  /** Percentage change as a decimal string ("12.50"), or null when undefined. */
  value: Money | null;
  /** Whether an increase is good news (income: yes, expenses: no). */
  upIsGood?: boolean;
  suffix?: string;
  /** false: the value is a difference in percentage points ("pts"), not a % change. */
  percent?: boolean;
  className?: string;
}

/**
 * Signed change with an arrow icon and text. Colour expresses good/bad, but the
 * direction is always readable from the sign and the icon.
 */
export function Delta({
  value,
  upIsGood = true,
  suffix = "vs mes anterior",
  percent = true,
  className,
}: DeltaProps) {
  if (value === null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Sin datos para comparar
      </span>
    );
  }

  const flat = isZero(value);
  const down = isNegative(value);
  const good = flat ? null : down ? !upIsGood : upIsGood;
  const Icon = flat ? Minus : down ? ArrowDownRight : ArrowUpRight;
  const direction = flat ? "sin cambios" : down ? "bajó" : "subió";

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 text-xs", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium",
          good === true && "text-positive",
          good === false && "text-negative",
          good === null && "text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{direction}</span>
        {percent
          ? formatPercent(value, { signDisplay: "always" })
          : formatPercent(value, { signDisplay: "always" }).replace(" %", "")}
      </span>
      <span className="text-muted-foreground">{suffix}</span>
    </span>
  );
}
