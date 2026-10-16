import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TransactionType } from "@/types/api";

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
};

/** Icon + text label: the type never depends on color alone. */
export function TransactionTypeBadge({
  type,
  className,
}: {
  type: TransactionType;
  className?: string;
}) {
  const isIncome = type === "INCOME";
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={isIncome ? "income" : "expense"} className={className}>
      <Icon aria-hidden="true" />
      {TRANSACTION_TYPE_LABELS[type]}
    </Badge>
  );
}
