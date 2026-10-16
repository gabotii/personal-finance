import { formatMoney, type SignDisplay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Currency, Money, TransactionType } from "@/types/api";

interface CurrencyDisplayProps {
  value: Money | null | undefined;
  currency: Currency;
  /** When given, the amount is shown signed (+ income / − expense) with its text token. */
  type?: TransactionType;
  compact?: boolean;
  signDisplay?: SignDisplay;
  className?: string;
}

/**
 * Formats a backend decimal string. With `type`, income reads "+$25.000" and expense
 * "−$25.000": the sign carries the meaning, color only reinforces it.
 */
export function CurrencyDisplay({
  value,
  currency,
  type,
  compact = false,
  signDisplay,
  className,
}: CurrencyDisplayProps) {
  if (type) {
    const formatted = formatMoney(value, currency, { compact, signDisplay: "never" });
    const isIncome = type === "INCOME";
    return (
      <span
        className={cn(
          "tabular whitespace-nowrap font-medium",
          isIncome ? "text-income-text" : "text-expense-text",
          className,
        )}
      >
        {isIncome ? "+" : "−"}
        {formatted}
      </span>
    );
  }
  return (
    <span className={cn("whitespace-nowrap", className)}>
      {formatMoney(value, currency, { compact, signDisplay })}
    </span>
  );
}
