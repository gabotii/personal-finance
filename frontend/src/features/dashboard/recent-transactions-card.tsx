import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CategoryIcon } from "@/components/category-icon";
import { CurrencyDisplay } from "@/components/currency-display";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { Currency, Transaction } from "@/types/api";

interface RecentTransactionsCardProps {
  items: Transaction[] | undefined;
  currency: Currency;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function RecentTransactionsCard({
  items,
  currency,
  isPending,
  isError,
  onRetry,
}: RecentTransactionsCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Últimos movimientos</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/transactions">
            Ver todos
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-2 sm:px-3">
        {isError ? (
          <ErrorState compact title="No pudimos cargar tus movimientos" onRetry={onRetry} />
        ) : (
          <ul className="divide-y" aria-busy={isPending || undefined}>
            {isPending || !items
              ? Array.from({ length: 5 }, (_, index) => (
                  <li key={index} className="flex items-center gap-3 px-3 py-3">
                    <Skeleton className="size-9 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </li>
                ))
              : items.map((transaction) => (
                  <li key={transaction.id} className="flex items-center gap-3 px-3 py-3">
                    <CategoryIcon
                      icon={transaction.category.icon}
                      color={transaction.category.color}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{transaction.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {transaction.category.name} ·{" "}
                        {formatDate(transaction.transaction_date, "short")}
                      </p>
                    </div>
                    <CurrencyDisplay
                      value={transaction.amount}
                      currency={currency}
                      type={transaction.type}
                      className="text-sm"
                    />
                  </li>
                ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
