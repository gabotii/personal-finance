import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { errorMessage } from "@/lib/errors";
import { exportsApi } from "@/services/api";
import type { TransactionFilters } from "@/types/api";

type ExportFormat = "csv" | "excel";

export function useExport() {
  return useMutation({
    mutationFn: ({ format, filters }: { format: ExportFormat; filters: TransactionFilters }) =>
      format === "csv" ? exportsApi.csv(filters) : exportsApi.excel(filters),
    onSuccess: (filename) => toast.success("Exportación completada", { description: filename }),
    onError: (error) => toast.error("No pudimos exportar", { description: errorMessage(error) }),
  });
}
