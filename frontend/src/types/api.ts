/**
 * API contract. Mirrors the backend Pydantic schemas exactly (app/schemas/*).
 * Money values are decimal strings ("25000.00") and are never converted to floats for math.
 */

export type Money = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;
export type MonthKey = string; // YYYY-MM

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CURRENCIES = ["CLP", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const THEMES = ["LIGHT", "DARK", "SYSTEM"] as const;
export type ThemePreference = (typeof THEMES)[number];

export const TRANSACTION_SORTS = ["date_desc", "date_asc", "amount_desc", "amount_asc"] as const;
export type TransactionSort = (typeof TRANSACTION_SORTS)[number];

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface ApiEnvelope<T> {
  data: T;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: {
      fields?: Record<string, string>;
      [key: string]: unknown;
    };
  };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ---------------------------------------------------------------- users / auth

export interface User {
  id: string;
  name: string;
  email: string;
  currency: Currency;
  timezone: string;
  theme: ThemePreference;
  created_at: ISODateTime;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  currency?: Currency;
  timezone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserUpdatePayload {
  name?: string;
  currency?: Currency;
  timezone?: string;
  theme?: ThemePreference;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

// ------------------------------------------------------------------ categories

export interface CategorySummary {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_active: boolean;
}

export interface Category extends CategorySummary {
  transaction_count: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CategoryCreatePayload {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export type CategoryUpdatePayload = Partial<CategoryCreatePayload> & { is_active?: boolean };

// ---------------------------------------------------------------- transactions

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: Money;
  description: string;
  notes: string | null;
  transaction_date: ISODate;
  category: CategorySummary;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TransactionPayload {
  type: TransactionType;
  amount: Money;
  description: string;
  notes: string | null;
  category_id: string;
  transaction_date: ISODate;
}

export type TransactionUpdatePayload = Partial<TransactionPayload>;

export interface TransactionFilters {
  date_from?: ISODate;
  date_to?: ISODate;
  type?: TransactionType;
  category_id?: string;
  q?: string;
  min_amount?: Money;
  max_amount?: Money;
}

export interface TransactionListParams extends TransactionFilters {
  page: number;
  page_size: PageSize;
  sort: TransactionSort;
}

// ------------------------------------------------------------------- dashboard

export interface PeriodTotals {
  income: Money;
  expense: Money;
  net: Money;
  savings_rate: Money | null;
  transaction_count: number;
}

export interface PeriodSummary {
  currency: Currency;
  date_from: ISODate;
  date_to: ISODate;
  totals: PeriodTotals;
}

export interface MetricComparison {
  current: Money;
  previous: Money;
  difference: Money;
  difference_pct: Money | null;
}

export interface DashboardSummary {
  month: MonthKey;
  currency: Currency;
  balance: Money;
  previous_balance: Money;
  balance_change_pct: Money | null;
  current: PeriodTotals;
  previous: PeriodTotals;
  comparison: {
    income: MetricComparison;
    expense: MetricComparison;
    net: MetricComparison;
  };
}

export interface MonthlyPoint {
  month: MonthKey;
  income: Money;
  expense: Money;
  net: Money;
  balance: Money;
}

export interface MonthlySeries {
  currency: Currency;
  items: MonthlyPoint[];
}

export interface CategoryBreakdownItem {
  category_id: string;
  name: string;
  color: string;
  icon: string;
  total: Money;
  percentage: Money;
  transaction_count: number;
}

export interface CategoryBreakdown {
  currency: Currency;
  type: TransactionType;
  date_from: ISODate;
  date_to: ISODate;
  total: Money;
  items: CategoryBreakdownItem[];
}

export interface DailyPoint {
  date: ISODate;
  income: Money;
  expense: Money;
  net: Money;
}

export interface DailySeries {
  currency: Currency;
  month: MonthKey;
  items: DailyPoint[];
}
