import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <LoaderCircle
        className={cn("size-5 animate-spin text-muted-foreground", className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label ?? "Cargando"}</span>
    </span>
  );
}

export function LoadingState({
  label = "Cargando",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center py-14", className)}>
      <Spinner label={label} />
    </div>
  );
}

export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        <span role="status">{label}…</span>
      </div>
    </div>
  );
}
