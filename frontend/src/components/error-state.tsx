import { CircleAlert, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "No pudimos cargar la información",
  description = "Comprueba tu conexión e inténtalo nuevamente.",
  onRetry,
  retrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <CircleAlert className="size-5" aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying}>
          {!retrying && <RefreshCw aria-hidden="true" />}
          Reintentar
        </Button>
      )}
    </div>
  );
}
