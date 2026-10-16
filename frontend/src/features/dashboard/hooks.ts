import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { dashboardApi } from "@/services/api";
import type { ISODate, MonthKey, TransactionType } from "@/types/api";

export function useDashboardSummary(month: MonthKey | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(month),
    queryFn: async ({ signal }) => (await dashboardApi.summary(month, signal)).data,
    placeholderData: keepPreviousData,
  });
}

export function useMonthlySeries(months: number, endMonth: MonthKey | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.monthly(months, endMonth),
    queryFn: async ({ signal }) => (await dashboardApi.monthly(months, endMonth, signal)).data,
    placeholderData: keepPreviousData,
  });
}

export function usePeriodSummary(dateFrom?: ISODate, dateTo?: ISODate) {
  return useQuery({
    queryKey: queryKeys.dashboard.period(dateFrom, dateTo),
    queryFn: async ({ signal }) =>
      (await dashboardApi.period({ date_from: dateFrom, date_to: dateTo }, signal)).data,
    placeholderData: keepPreviousData,
  });
}

export function useCategoryBreakdown(type: TransactionType, dateFrom?: ISODate, dateTo?: ISODate) {
  return useQuery({
    queryKey: queryKeys.dashboard.categories(type, dateFrom, dateTo),
    queryFn: async ({ signal }) =>
      (await dashboardApi.categories({ type, date_from: dateFrom, date_to: dateTo }, signal)).data,
    placeholderData: keepPreviousData,
  });
}

export function useDailySeries(month: MonthKey | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.daily(month),
    queryFn: async ({ signal }) => (await dashboardApi.daily(month, signal)).data,
    placeholderData: keepPreviousData,
  });
}
