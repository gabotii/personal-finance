import { Plus, SearchX } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@/features/auth/hooks";
import { ExportMenu } from "@/features/exports/export-menu";
import { useTransactions } from "@/features/transactions/hooks";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-context";
import { TransactionFiltersBar } from "@/features/transactions/transaction-filters";
import { TransactionList } from "@/features/transactions/transaction-list";
import { useTransactionParams } from "@/features/transactions/use-transaction-params";

export function TransactionsPage() {
  const user = useUser();
  const { openCreate } = useTransactionDialog();
  const { params, filters, update, clearFilters, activeFilterCount } = useTransactionParams();
  const query = useTransactions(params);
  const data = query.data;
  const showEmpty = !query.isPending && !query.isError && data?.total === 0;

  // A bookmarked page beyond the end (e.g. after deletions) falls back to the last page.
  const lastPage = data && !query.isPlaceholderData ? data.total_pages : null;
  useEffect(() => {
    if (lastPage && params.page > lastPage) update({ page: lastPage });
  }, [lastPage, params.page, update]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Todos tus ingresos y gastos en un solo lugar."
        actions={
          <>
            <ExportMenu filters={filters} hasFilters={activeFilterCount > 0} />
            <Button onClick={() => openCreate()}>
              <Plus aria-hidden="true" />
              Nuevo
            </Button>
          </>
        }
      />

      <TransactionFiltersBar
        params={params}
        onChange={update}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      <Card className="overflow-hidden">
        {query.isError ? (
          <ErrorState
            title="No pudimos cargar tus movimientos"
            description="Comprueba tu conexión e inténtalo nuevamente."
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : showEmpty ? (
          activeFilterCount > 0 ? (
            <EmptyState
              icon={SearchX}
              title="No hay movimientos con estos filtros"
              description="Prueba con otros criterios o limpia los filtros."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="Todavía no tienes movimientos"
              description="Registra tu primer ingreso o gasto para comenzar a visualizar tus finanzas."
              action={
                <Button onClick={() => openCreate()}>
                  <Plus aria-hidden="true" />
                  Registrar movimiento
                </Button>
              }
            />
          )
        ) : (
          <div
            className={
              query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"
            }
          >
            <TransactionList
              items={data?.items ?? []}
              currency={user.currency}
              loading={query.isPending}
            />
          </div>
        )}
      </Card>

      {data && data.total > 0 && (
        <Pagination
          page={params.page}
          pageSize={params.page_size}
          total={data.total}
          totalPages={data.total_pages}
          onPageChange={(page) => {
            update({ page });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onPageSizeChange={(pageSize) => update({ page_size: pageSize })}
          disabled={query.isFetching && query.isPlaceholderData}
        />
      )}
    </div>
  );
}
