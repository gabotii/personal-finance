import { createContext, useContext } from "react";

import type { Transaction, TransactionType } from "@/types/api";

export interface TransactionDialogContextValue {
  openCreate: (type?: TransactionType) => void;
  openEdit: (transaction: Transaction) => void;
  openDelete: (transaction: Transaction) => void;
}

export const TransactionDialogContext = createContext<TransactionDialogContextValue | null>(null);

export function useTransactionDialog(): TransactionDialogContextValue {
  const context = useContext(TransactionDialogContext);
  if (!context) {
    throw new Error("useTransactionDialog must be used inside <TransactionDialogProvider>.");
  }
  return context;
}
