import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Transaction, TransactionType } from "@/types/api";

import { DeleteTransactionDialog } from "./delete-transaction-dialog";
import { TransactionDialogContext } from "./transaction-dialog-context";
import { TransactionFormDialog } from "./transaction-form-dialog";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest("[role=dialog],[role=alertdialog],[role=listbox],[role=menu]") !== null
  );
}

/**
 * Hosts the create/edit and delete dialogs once for the whole app, so any screen (and the
 * global "N" shortcut) can open them without duplicating markup.
 */
export function TransactionDialogProvider({ children }: { children: ReactNode }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>("EXPENSE");
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const openCreate = useCallback((type: TransactionType = "EXPENSE") => {
    setEditing(null);
    setDefaultType(type);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((transaction: Transaction) => {
    setEditing(transaction);
    setFormOpen(true);
  }, []);

  const openDelete = useCallback((transaction: Transaction) => setDeleting(transaction), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      openCreate();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openCreate]);

  const value = useMemo(
    () => ({ openCreate, openEdit, openDelete }),
    [openCreate, openEdit, openDelete],
  );

  return (
    <TransactionDialogContext.Provider value={value}>
      {children}
      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        defaultType={defaultType}
      />
      <DeleteTransactionDialog
        transaction={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </TransactionDialogContext.Provider>
  );
}
