import { Navigate, Outlet, useLocation } from "react-router";

import { ErrorState } from "@/components/error-state";
import { FullPageLoader } from "@/components/loading-state";

import { useCurrentUser } from "./hooks";

export function RequireAuth() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <FullPageLoader label="Cargando tu sesión" />;
  if (isError) {
    return (
      <div className="grid min-h-dvh place-items-center p-4">
        <ErrorState
          title="No pudimos verificar tu sesión"
          description="Comprueba tu conexión e inténtalo nuevamente."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <FullPageLoader label="Cargando" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
