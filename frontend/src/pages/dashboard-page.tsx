import { Plus, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router";

import { ChartCard } from "@/components/chart-card";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@/features/auth/hooks";
import { CategoryDonut } from "@/features/charts/category-donut-chart";
import { DailyExpensesChart, DailyExpensesTable } from "@/features/charts/daily-chart";
import {
  MonthlyEvolutionChart,
  MonthlyEvolutionLegend,
  MonthlyEvolutionTable,
} from "@/features/charts/monthly-evolution-chart";
import {
  useCategoryBreakdown,
  useDailySeries,
  useDashboardSummary,
  useMonthlySeries,
} from "@/features/dashboard/hooks";
import {
  MonthComparisonCard,
  MonthComparisonSkeleton,
} from "@/features/dashboard/month-comparison-card";
import { MonthNavigator } from "@/features/dashboard/month-navigator";
import { RecentTransactionsCard } from "@/features/dashboard/recent-transactions-card";
import { SummaryCards, SummaryCardsSkeleton } from "@/features/dashboard/summary-cards";
import { useTransactions } from "@/features/transactions/hooks";
import { useTransactionDialog } from "@/features/transactions/transaction-dialog-context";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { formatMoney, formatMonth } from "@/lib/format";
import { isZero } from "@/lib/money";
import type { MonthKey } from "@/types/api";

export function DashboardPage() {
  const user = useUser();
  const { openCreate } = useTransactionDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const thisMonth = currentMonth(user.timezone);
  const requested = searchParams.get("month");
  const month: MonthKey = isValidMonth(requested) && requested <= thisMonth ? requested : thisMonth;
  const range = monthRange(month);

  const summary = useDashboardSummary(month);
  const monthly = useMonthlySeries(6, month);
  const categories = useCategoryBreakdown("EXPENSE", range.from, range.to);
  const daily = useDailySeries(month);
  const recent = useTransactions({ page: 1, page_size: 10, sort: "date_desc" });

  const setMonth = (next: MonthKey) => {
    setSearchParams(next === thisMonth ? {} : { month: next }, { replace: true });
  };

  const isNewUser = recent.data?.total === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Tu resumen financiero del mes."
        actions={<MonthNavigator month={month} maxMonth={thisMonth} onChange={setMonth} />}
      />

      {isNewUser ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Todavía no tienes movimientos"
            description="Registra tu primer ingreso o gasto para comenzar a visualizar tus finanzas."
            action={
              <Button onClick={() => openCreate()}>
                <Plus aria-hidden="true" />
                Registrar movimiento
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {summary.isPending ? (
            <SummaryCardsSkeleton />
          ) : summary.isError ? (
            <Card>
              <ErrorState
                title="No pudimos cargar tu resumen"
                onRetry={() => void summary.refetch()}
                retrying={summary.isFetching}
              />
            </Card>
          ) : (
            <SummaryCards summary={summary.data} />
          )}

          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Evolución financiera"
              description="Ingresos, gastos y balance de los últimos 6 meses"
              summary={
                monthly.data
                  ? `Gráfico de ingresos y gastos de ${monthly.data.items.length} meses.`
                  : undefined
              }
              status={monthly.isPending ? "pending" : monthly.isError ? "error" : "success"}
              onRetry={() => void monthly.refetch()}
              legend={<MonthlyEvolutionLegend />}
              chart={() =>
                monthly.data && (
                  <MonthlyEvolutionChart
                    items={monthly.data.items}
                    currency={monthly.data.currency}
                  />
                )
              }
              table={() =>
                monthly.data && (
                  <MonthlyEvolutionTable
                    items={monthly.data.items}
                    currency={monthly.data.currency}
                  />
                )
              }
            />

            <ChartCard
              title="Gastos por categoría"
              description={formatMonth(month)}
              status={
                categories.isPending
                  ? "pending"
                  : categories.isError
                    ? "error"
                    : categories.data.items.length === 0
                      ? "empty"
                      : "success"
              }
              onRetry={() => void categories.refetch()}
              emptyTitle="Sin gastos este mes"
              emptyDescription="Cuando registres gastos, verás aquí cómo se distribuyen."
            >
              {categories.data && (
                <CategoryDonut
                  breakdown={categories.data}
                  totalLabel="Total gastos"
                  className="xl:grid-cols-1"
                />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Gastos diarios"
              description={formatMonth(month)}
              summary={
                summary.data
                  ? `Gastos por día de ${formatMonth(month)}. Total ${formatMoney(summary.data.current.expense, user.currency)}.`
                  : undefined
              }
              status={
                daily.isPending
                  ? "pending"
                  : daily.isError
                    ? "error"
                    : summary.data && isZero(summary.data.current.expense)
                      ? "empty"
                      : "success"
              }
              onRetry={() => void daily.refetch()}
              emptyTitle="Sin gastos este mes"
              chart={() =>
                daily.data && (
                  <DailyExpensesChart items={daily.data.items} currency={daily.data.currency} />
                )
              }
              table={() =>
                daily.data && (
                  <DailyExpensesTable items={daily.data.items} currency={daily.data.currency} />
                )
              }
              height={240}
            />
            {summary.isPending ? (
              <MonthComparisonSkeleton />
            ) : summary.data ? (
              <MonthComparisonCard summary={summary.data} />
            ) : null}
          </div>

          <RecentTransactionsCard
            items={recent.data?.items.slice(0, 6)}
            currency={user.currency}
            isPending={recent.isPending}
            isError={recent.isError}
            onRetry={() => void recent.refetch()}
          />
        </>
      )}
    </div>
  );
}
