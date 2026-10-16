import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
  loading?: boolean;
  skeletonRows?: number;
  className?: string;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };

/** Semantic, accessible table. The caption is visually hidden but read by screen readers. */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  loading = false,
  skeletonRows = 8,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("relative w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground first:pl-5 last:pr-5",
                  ALIGN[column.align ?? "left"],
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={index} className="border-b last:border-0">
                  {columns.map((column) => (
                    <td key={column.id} className="px-4 py-4 first:pl-5 last:pr-5">
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b transition-colors last:border-0 hover:bg-muted/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-3 align-middle first:pl-5 last:pr-5",
                        ALIGN[column.align ?? "left"],
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
