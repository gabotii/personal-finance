import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import { authApi, isApiError, usersApi } from "@/services/api";
import type {
  LoginPayload,
  PasswordChangePayload,
  RegisterPayload,
  User,
  UserUpdatePayload,
} from "@/types/api";

/** The signed-in user, or null when there is no valid session. */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      try {
        return (await authApi.me(signal)).data;
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Same as useCurrentUser but for components rendered behind <RequireAuth>. */
export function useUser(): User {
  const { data } = useCurrentUser();
  if (!data) throw new Error("useUser() requires an authenticated route.");
  return data;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: ({ data }) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
      queryClient.setQueryData(queryKeys.me, data);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: ({ data }) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
      queryClient.setQueryData(queryKeys.me, data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      // Drop every cached resource of this user, even if the request failed.
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserUpdatePayload) => usersApi.update(payload),
    onSuccess: ({ data }, payload) => {
      queryClient.setQueryData(queryKeys.me, data);
      if (payload.currency || payload.timezone) {
        // Currency and timezone change how amounts and "this month" are computed.
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: PasswordChangePayload) => usersApi.changePassword(payload),
  });
}
