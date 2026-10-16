import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/format";
import { PAGE_SIZES, type PageSize } from "@/types/api";

interface PaginationProps {
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  disabled?: boolean;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const canPrevious = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0
          ? "Sin resultados"
          : `${formatCount(first)}–${formatCount(last)} de ${formatCount(total)}`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span id="page-size-label" className="text-sm text-muted-foreground">
            Por página
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value) as PageSize)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 w-[4.5rem]" aria-labelledby="page-size-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={!canPrevious}
            aria-label="Primera página"
            className="hidden sm:inline-flex"
          >
            <ChevronsLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrevious}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="tabular min-w-[5.5rem] text-center text-sm">
            {totalPages === 0 ? "0 / 0" : `${page} / ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Página siguiente"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            aria-label="Última página"
            className="hidden sm:inline-flex"
          >
            <ChevronsRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
