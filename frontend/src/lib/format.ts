import type { Currency, ISODate, Money, MonthKey } from "@/types/api";

import { CURRENCY_DECIMALS, moneyToNumber } from "./money";

const LOCALE = "es-CL";
const MINUS = "−";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    const decimals = CURRENCY_DECIMALS[currency];
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 1 : decimals,
    });
    currencyFormatters.set(key, formatter);
  }
  return formatter;
}

export type SignDisplay = "auto" | "always" | "never";

export function formatMoney(
  value: Money | null | undefined,
  currency: Currency,
  options: { compact?: boolean; signDisplay?: SignDisplay } = {},
): string {
  const number = moneyToNumber(value);
  const formatted = currencyFormatter(currency, options.compact ?? false).format(Math.abs(number));
  const sign = options.signDisplay ?? "auto";
  if (sign === "never" || number === 0) return formatted;
  if (number < 0) return `${MINUS}${formatted}`;
  return sign === "always" ? `+${formatted}` : formatted;
}

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** `value` is already a percentage: "12.50" means 12.5 %. */
export function formatPercent(
  value: Money | null | undefined,
  options: { signDisplay?: "auto" | "always" } = {},
): string {
  if (value === null || value === undefined) return "—";
  const number = moneyToNumber(value);
  const formatted = `${percentFormatter.format(Math.abs(number))} %`;
  if (number < 0) return `${MINUS}${formatted}`;
  if (number > 0 && options.signDisplay === "always") return `+${formatted}`;
  return formatted;
}

export function parseISODate(value: ISODate): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

const dateFormatters = {
  short: new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short" }),
  medium: new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" }),
  long: new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" }),
};

export function formatDate(value: ISODate, style: keyof typeof dateFormatters = "medium"): string {
  return dateFormatters[style].format(parseISODate(value)).replaceAll(".", "");
}

const longMonthFormatter = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" });
const shortMonthFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short" });

export function formatMonth(month: MonthKey, style: "long" | "short" = "long"): string {
  const date = parseISODate(`${month}-01`);
  const text = (style === "long" ? longMonthFormatter : shortMonthFormatter)
    .format(date)
    .replaceAll(".", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}
