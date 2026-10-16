import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { transactionsApi } from "@/services/api";
import type {
  Page,
  Transaction,
  TransactionListParams,
  TransactionPayload,
  TransactionUpdatePayload,
} from "@/types/api";

export function useTransactions(params: TransactionListParams) {
  return useQuery<Page<Transaction>>({
    queryKey: queryKeys.transactions.list(params),
    queryFn: async ({ signal }) => (await transactionsApi.list(params, signal)).data,
    // Keep the current page on screen while the next one loads (no layout jump).
    placeholderData: keepPreviousData,
  });
}

/** Every write changes listings, dashboard totals and category usage counts. */
function invalidateAfterWrite(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransactionPayload) => transactionsApi.create(payload),
    onSuccess: () => invalidateAfterWrite(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TransactionUpdatePayload }) =>
      transactionsApi.update(id, payload),
    onSuccess: () => invalidateAfterWrite(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => invalidateAfterWrite(queryClient),
  });
}
