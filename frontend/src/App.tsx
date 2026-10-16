import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";

import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { Toaster } from "@/components/ui/toaster";
import { RedirectIfAuthenticated, RequireAuth } from "@/features/auth/route-guards";
import { ThemeProvider } from "@/features/theme/theme-provider";
import { AppLayout } from "@/layouts/app-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { createQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { onUnauthorized } from "@/services/api";

/** Route-level code splitting: charts and forms load only when their page is visited. */
function page<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const DashboardPage = page(() => import("@/pages/dashboard-page"), "DashboardPage");
const TransactionsPage = page(() => import("@/pages/transactions-page"), "TransactionsPage");
const CategoriesPage = page(() => import("@/pages/categories-page"), "CategoriesPage");
const ReportsPage = page(() => import("@/pages/reports-page"), "ReportsPage");
const SettingsPage = page(() => import("@/pages/settings-page"), "SettingsPage");
const LoginPage = page(() => import("@/pages/login-page"), "LoginPage");
const RegisterPage = page(() => import("@/pages/register-page"), "RegisterPage");
const NotFoundPage = page(() => import("@/pages/not-found-page"), "NotFoundPage");

function RouteError() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <ErrorState
        title="Algo salió mal"
        description="Ocurrió un error inesperado al mostrar esta pantalla."
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}

function SuspenseOutlet() {
  return (
    <Suspense fallback={<LoadingState label="Cargando página" />}>
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                element: <SuspenseOutlet />,
                children: [
                  { path: "/login", element: <LoginPage /> },
                  { path: "/register", element: <RegisterPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                element: <SuspenseOutlet />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: "/transactions", element: <TransactionsPage /> },
                  { path: "/categories", element: <CategoriesPage /> },
                  { path: "/reports", element: <ReportsPage /> },
                  { path: "/settings", element: <SettingsPage /> },
                  { path: "*", element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

/** A 401 anywhere means the session is gone: drop the cached user so guards redirect. */
function SessionWatcher() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      onUnauthorized(() => {
        if (queryClient.getQueryData(queryKeys.me)) {
          queryClient.setQueryData(queryKeys.me, null);
        }
      }),
    [queryClient],
  );
  return null;
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionWatcher />
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
