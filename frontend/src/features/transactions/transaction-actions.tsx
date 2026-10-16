import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Transaction } from "@/types/api";

import { useTransactionDialog } from "./transaction-dialog-context";

export function TransactionActions({ transaction }: { transaction: Transaction }) {
  const { openEdit, openDelete } = useTransactionDialog();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Acciones para ${transaction.description}`}
        >
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => openEdit(transaction)}>
          <Pencil aria-hidden="true" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => openDelete(transaction)}>
          <Trash2 aria-hidden="true" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
