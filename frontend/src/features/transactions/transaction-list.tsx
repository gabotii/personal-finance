import { CategoryIcon } from "@/components/category-icon";
import { CurrencyDisplay } from "@/components/currency-display";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { TransactionTypeBadge } from "@/components/transaction-type-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { Currency, Transaction } from "@/types/api";

import { TransactionActions } from "./transaction-actions";

interface TransactionListProps {
  items: Transaction[];
  currency: Currency;
  loading: boolean;
}

/** Table from md (768px) up; stacked cards below, where a 6-column table is not usable. */
export function TransactionList({ items, currency, loading }: TransactionListProps) {
  const columns: DataTableColumn<Transaction>[] = [
    {
      id: "date",
      header: "Fecha",
      cell: (row) => (
        <time
          dateTime={row.transaction_date}
          className="tabular whitespace-nowrap text-muted-foreground"
        >
          {formatDate(row.transaction_date)}
        </time>
      ),
    },
    {
      id: "description",
      header: "Descripción",
      cell: (row) => (
        <div className="min-w-0 max-w-[22rem]">
          <p className="truncate font-medium">{row.description}</p>
          {row.notes && <p className="truncate text-xs text-muted-foreground">{row.notes}</p>}
        </div>
      ),
    },
    {
      id: "category",
      header: "Categoría",
      cell: (row) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <CategoryIcon icon={row.category.icon} color={row.category.color} size="sm" />
          {row.category.name}
        </span>
      ),
    },
    {
      id: "type",
      header: "Tipo",
      cell: (row) => <TransactionTypeBadge type={row.type} />,
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell",
    },
    {
      id: "amount",
      header: "Monto",
      align: "right",
      cell: (row) => <CurrencyDisplay value={row.amount} currency={currency} type={row.type} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-12",
      cell: (row) => <TransactionActions transaction={row} />,
    },
  ];

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          rows={items}
          getRowKey={(row) => row.id}
          caption="Listado de movimientos"
          loading={loading}
          skeletonRows={8}
        />
      </div>
      <ul
        className="divide-y md:hidden"
        aria-label="Listado de movimientos"
        aria-busy={loading || undefined}
      >
        {loading
          ? Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-20" />
              </li>
            ))
          : items.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} currency={currency} />
            ))}
      </ul>
    </>
  );
}

function TransactionCard({
  transaction,
  currency,
}: {
  transaction: Transaction;
  currency: Currency;
}) {
  return (
    <li className="flex items-center gap-3 py-3 pl-4 pr-2">
      <CategoryIcon icon={transaction.category.icon} color={transaction.category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{transaction.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {transaction.category.name} ·{" "}
          <time dateTime={transaction.transaction_date}>
            {formatDate(transaction.transaction_date, "short")}
          </time>
        </p>
      </div>
      <CurrencyDisplay
        value={transaction.amount}
        currency={currency}
        type={transaction.type}
        className="text-sm"
      />
      <TransactionActions transaction={transaction} />
    </li>
  );
}
