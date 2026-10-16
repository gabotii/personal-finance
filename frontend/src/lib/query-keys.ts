import type { MonthKey, TransactionListParams, TransactionType } from "@/types/api";

/** Centralized TanStack Query keys. Prefixes allow invalidating whole families at once. */
export const queryKeys = {
  me: ["auth", "me"] as const,
  categories: ["categories"] as const,
  transactions: {
    all: ["transactions"] as const,
    list: (params: TransactionListParams) => ["transactions", "list", params] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    summary: (month: MonthKey | undefined) => ["dashboard", "summary", month ?? "current"] as const,
    monthly: (months: number, endMonth: MonthKey | undefined) =>
      ["dashboard", "monthly", months, endMonth ?? "current"] as const,
    period: (from?: string, to?: string) => ["dashboard", "period", from ?? "", to ?? ""] as const,
    categories: (type: TransactionType, from?: string, to?: string) =>
      ["dashboard", "categories", type, from ?? "", to ?? ""] as const,
    daily: (month: MonthKey | undefined) => ["dashboard", "daily", month ?? "current"] as const,
  },
};
