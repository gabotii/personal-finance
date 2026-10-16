import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { categoriesApi } from "@/services/api";
import type { Category, CategoryCreatePayload, CategoryUpdatePayload } from "@/types/api";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories,
    queryFn: async ({ signal }) => (await categoriesApi.list(signal)).data,
    staleTime: 60_000,
  });
}

function invalidateCategoryDependents(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
  // Names, colours and reassignments show up in listings and charts.
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryCreatePayload) => categoriesApi.create(payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdatePayload }) =>
      categoriesApi.update(id, payload),
    onSuccess: () => invalidateCategoryDependents(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reassignTo }: { id: string; reassignTo?: string }) =>
      categoriesApi.remove(id, reassignTo),
    onSuccess: () => invalidateCategoryDependents(queryClient),
  });
}
