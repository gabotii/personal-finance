import type { Currency, Money } from "@/types/api";

export const CURRENCY_DECIMALS: Record<Currency, number> = { CLP: 0, USD: 2, EUR: 2 };

export const CURRENCY_LABELS: Record<Currency, string> = {
  CLP: "Peso chileno (CLP)",
  USD: "Dólar estadounidense (USD)",
  EUR: "Euro (EUR)",
};

const MAX_INTEGER_DIGITS = 12;

const GROUPED_INTEGER = /^\d{1,3}([.,]\d{3})+$/;

/** "1500" or a properly grouped "1.500" / "1,500"; anything else is ambiguous. */
function normalizeInteger(part: string): string | null {
  if (/^\d+$/.test(part)) return part;
  if (GROUPED_INTEGER.test(part)) return part.replace(/[.,]/g, "");
  return null;
}

/**
 * Normalizes what a person types into a decimal string the API accepts ("1234.5").
 * Returns null when the input is not a valid positive amount for the currency.
 * The value is never silently reinterpreted:
 *
 * - Thousands separators are accepted only in proper 3-digit groups ("25.000", "1,250,000").
 * - CLP has no decimals: "12,5" is rejected instead of being read as 125.
 * - USD/EUR: a trailing "." or "," followed by 1–2 digits is the decimal separator.
 */
export function parseAmountInput(raw: string, currency: Currency): string | null {
  const value = raw.trim().replace(/US|[\s$€]/g, "");
  if (!value || !/^[\d.,]+$/.test(value)) return null;

  let integerPart = value;
  let fractionPart = "";
  if (CURRENCY_DECIMALS[currency] > 0) {
    const match = value.match(/^(.*?)[.,](\d{1,2})$/);
    if (match) {
      integerPart = match[1] ?? "";
      fractionPart = match[2] ?? "";
    }
  }

  let normalizedInteger: string | null = "0";
  if (integerPart !== "") normalizedInteger = normalizeInteger(integerPart);
  else if (!fractionPart) return null;
  if (normalizedInteger === null) return null;

  normalizedInteger = normalizedInteger.replace(/^0+(?=\d)/, "");
  if (normalizedInteger.length > MAX_INTEGER_DIGITS) return null;
  const normalized = fractionPart ? `${normalizedInteger}.${fractionPart}` : normalizedInteger;
  return /^0+(\.0+)?$/.test(normalized) ? null : normalized;
}

/** Formats a decimal string for an editable input (grouped digits, no currency symbol). */
export function formatAmountInput(value: Money, currency: Currency): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: CURRENCY_DECIMALS[currency],
  }).format(number);
}

/** Display-only conversion (charts, formatting). Never used for money arithmetic. */
export function moneyToNumber(value: Money | null | undefined): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function isNegative(value: Money): boolean {
  return value.trim().startsWith("-") && !isZero(value);
}

export function isZero(value: Money): boolean {
  return /^-?0+(\.0+)?$/.test(value.trim());
}
