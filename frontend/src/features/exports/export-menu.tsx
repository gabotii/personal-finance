import { Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TransactionFilters } from "@/types/api";

import { useExport } from "./use-export";

interface ExportMenuProps {
  filters: TransactionFilters;
  hasFilters?: boolean;
  variant?: "outline" | "default";
  className?: string;
}

/** Exports exactly what the current filters show (the server applies the same filters). */
export function ExportMenu({
  filters,
  hasFilters = false,
  variant = "outline",
  className,
}: ExportMenuProps) {
  const mutation = useExport();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} loading={mutation.isPending} className={className}>
          {!mutation.isPending && <Download aria-hidden="true" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          {hasFilters ? "Exportar resultados filtrados" : "Exportar todos los movimientos"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => mutation.mutate({ format: "excel", filters })}>
          <FileSpreadsheet aria-hidden="true" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => mutation.mutate({ format: "csv", filters })}>
          <FileText aria-hidden="true" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
