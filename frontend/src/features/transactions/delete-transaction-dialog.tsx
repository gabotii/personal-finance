import { toast } from "sonner";

import { CurrencyDisplay } from "@/components/currency-display";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/features/auth/hooks";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { Transaction } from "@/types/api";

import { useDeleteTransaction } from "./hooks";

interface DeleteTransactionDialogProps {
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteTransactionDialog({
  transaction,
  onOpenChange,
}: DeleteTransactionDialogProps) {
  const user = useUser();
  const mutation = useDeleteTransaction();

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      await mutation.mutateAsync(transaction.id);
      toast.success("Movimiento eliminado");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AlertDialog open={transaction !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Tus balances y reportes se recalcularán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {transaction && (
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{transaction.description}</p>
              <p className="text-xs text-muted-foreground">
                {transaction.category.name} · {formatDate(transaction.transaction_date)}
              </p>
            </div>
            <CurrencyDisplay
              value={transaction.amount}
              currency={user.currency}
              type={transaction.type}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} loading={mutation.isPending}>
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
