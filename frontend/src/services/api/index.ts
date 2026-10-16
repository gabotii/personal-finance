import type {
  Category,
  CategoryBreakdown,
  CategoryCreatePayload,
  CategoryUpdatePayload,
  DailySeries,
  DashboardSummary,
  LoginPayload,
  MonthKey,
  MonthlySeries,
  Page,
  PeriodSummary,
  PasswordChangePayload,
  RegisterPayload,
  Transaction,
  TransactionFilters,
  TransactionListParams,
  TransactionPayload,
  TransactionType,
  TransactionUpdatePayload,
  User,
  UserUpdatePayload,
  ISODate,
} from "@/types/api";

import { apiClient, type QueryParams } from "./client";

export { ApiError, isApiError, onUnauthorized } from "./client";

const filtersQuery = (filters: TransactionFilters): QueryParams => ({ ...filters });

export const authApi = {
  register: (payload: RegisterPayload) => apiClient.post<User>("/auth/register", payload),
  login: (payload: LoginPayload) => apiClient.post<User>("/auth/login", payload),
  logout: () => apiClient.post<null>("/auth/logout"),
  me: (signal?: AbortSignal) => apiClient.get<User>("/auth/me", undefined, signal),
};

export const usersApi = {
  update: (payload: UserUpdatePayload) => apiClient.patch<User>("/users/me", payload),
  changePassword: (payload: PasswordChangePayload) =>
    apiClient.post<null>("/users/me/password", payload),
};

export const transactionsApi = {
  list: (params: TransactionListParams, signal?: AbortSignal) =>
    apiClient.get<Page<Transaction>>("/transactions", { ...params }, signal),
  get: (id: string, signal?: AbortSignal) =>
    apiClient.get<Transaction>(`/transactions/${id}`, undefined, signal),
  create: (payload: TransactionPayload) => apiClient.post<Transaction>("/transactions", payload),
  update: (id: string, payload: TransactionUpdatePayload) =>
    apiClient.patch<Transaction>(`/transactions/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/transactions/${id}`),
};

export const categoriesApi = {
  list: (signal?: AbortSignal) => apiClient.get<Category[]>("/categories", undefined, signal),
  create: (payload: CategoryCreatePayload) => apiClient.post<Category>("/categories", payload),
  update: (id: string, payload: CategoryUpdatePayload) =>
    apiClient.patch<Category>(`/categories/${id}`, payload),
  remove: (id: string, reassignTo?: string) =>
    apiClient.delete(`/categories/${id}`, { reassign_to: reassignTo }),
};

export const dashboardApi = {
  summary: (month: MonthKey | undefined, signal?: AbortSignal) =>
    apiClient.get<DashboardSummary>("/dashboard/summary", { month }, signal),
  monthly: (months: number, endMonth: MonthKey | undefined, signal?: AbortSignal) =>
    apiClient.get<MonthlySeries>("/dashboard/monthly", { months, end_month: endMonth }, signal),
  period: (params: { date_from?: ISODate; date_to?: ISODate }, signal?: AbortSignal) =>
    apiClient.get<PeriodSummary>("/dashboard/period", params, signal),
  categories: (
    params: { type: TransactionType; date_from?: ISODate; date_to?: ISODate },
    signal?: AbortSignal,
  ) => apiClient.get<CategoryBreakdown>("/dashboard/categories", params, signal),
  daily: (month: MonthKey | undefined, signal?: AbortSignal) =>
    apiClient.get<DailySeries>("/dashboard/daily", { month }, signal),
};

export const exportsApi = {
  csv: (filters: TransactionFilters) =>
    apiClient.download("/export/csv", filtersQuery(filters), "movimientos.csv"),
  excel: (filters: TransactionFilters) =>
    apiClient.download("/export/excel", filtersQuery(filters), "movimientos.xlsx"),
};
