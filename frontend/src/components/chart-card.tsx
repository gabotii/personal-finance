import { ChartColumn, Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  /** Short text summary for screen readers (role="img" label of the plot). */
  summary?: string;
  actions?: ReactNode;
  legend?: ReactNode;
  status: "pending" | "error" | "empty" | "success";
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  chart?: () => ReactNode;
  /** Custom body (already accessible on its own) used instead of `chart`/`legend`. */
  children?: ReactNode;
  /** Accessible data table alternative to the chart. */
  table?: () => ReactNode;
  height?: number;
  className?: string;
}

export function ChartCard({
  title,
  description,
  summary,
  actions,
  legend,
  status,
  onRetry,
  emptyTitle = "Sin datos para este período",
  emptyDescription = "Registra movimientos para ver este gráfico.",
  chart,
  children,
  table,
  height = 280,
  className,
}: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();

  return (
    <Card
      role="region"
      className={cn("flex min-w-0 flex-col", className)}
      aria-labelledby={headingId}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle id={headingId}>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {table && status === "success" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowTable((value) => !value)}
              aria-pressed={showTable}
              aria-label={showTable ? "Ver como gráfico" : "Ver como tabla"}
              title={showTable ? "Ver como gráfico" : "Ver como tabla"}
            >
              {showTable ? <ChartColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {status === "pending" && <Skeleton className="w-full rounded-xl" style={{ height }} />}
        {status === "error" && (
          <ErrorState compact title="No pudimos cargar este gráfico" onRetry={onRetry} />
        )}
        {status === "empty" && (
          <EmptyState compact title={emptyTitle} description={emptyDescription} />
        )}
        {status === "success" && children}
        {status === "success" && !children && chart && (
          <>
            {legend && !showTable && legend}
            {showTable && table ? (
              <div className="relative max-h-[22rem] overflow-auto rounded-lg border">
                {table()}
              </div>
            ) : (
              // Grows to fill the card when a sibling card in the same grid row is taller.
              <div
                role="img"
                aria-label={summary ?? title}
                style={{ minHeight: height }}
                className="relative w-full flex-1"
              >
                <div className="absolute inset-0">{chart()}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
