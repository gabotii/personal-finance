import { ArrowDownRight, ArrowUpRight, PiggyBank, Scale } from "lucide-react";
import { useState } from "react";

import { ChartCard } from "@/components/chart-card";
import { CurrencyDisplay } from "@/components/currency-display";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatCardSkeleton } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/features/auth/hooks";
import { CategoryDonut } from "@/features/charts/category-donut-chart";
import {
  MonthlyEvolutionChart,
  MonthlyEvolutionLegend,
  MonthlyEvolutionTable,
} from "@/features/charts/monthly-evolution-chart";
import {
  useCategoryBreakdown,
  useMonthlySeries,
  usePeriodSummary,
} from "@/features/dashboard/hooks";
import { ExportMenu } from "@/features/exports/export-menu";
import { currentMonth, isValidISODate, monthRange, shiftMonth } from "@/lib/dates";
import { formatCount, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ISODate, TransactionType } from "@/types/api";

type Preset =
  "this_month" | "last_month" | "last_3_months" | "last_12_months" | "this_year" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  this_month: "Este mes",
  last_month: "Mes anterior",
  last_3_months: "Últimos 3 meses",
  last_12_months: "Últimos 12 meses",
  this_year: "Este año",
  custom: "Personalizado",
};

function presetRange(
  preset: Exclude<Preset, "custom">,
  timeZone: string,
): { from: ISODate; to: ISODate } {
  const month = currentMonth(timeZone);
  switch (preset) {
    case "this_month":
      return monthRange(month);
    case "last_month":
      return monthRange(shiftMonth(month, -1));
    case "last_3_months":
      return { from: monthRange(shiftMonth(month, -2)).from, to: monthRange(month).to };
    case "last_12_months":
      return { from: monthRange(shiftMonth(month, -11)).from, to: monthRange(month).to };
    case "this_year":
      return { from: `${month.slice(0, 4)}-01-01`, to: `${month.slice(0, 4)}-12-31` };
  }
}

export function ReportsPage() {
  const user = useUser();
  const [preset, setPreset] = useState<Preset>("this_month");
  const [custom, setCustom] = useState(() => monthRange(currentMonth(user.timezone)));

  const range = preset === "custom" ? custom : presetRange(preset, user.timezone);
  const customInvalid =
    preset === "custom" &&
    (!isValidISODate(custom.from) || !isValidISODate(custom.to) || custom.from > custom.to);
  const from = customInvalid ? undefined : range.from;
  const to = customInvalid ? undefined : range.to;

  const period = usePeriodSummary(from, to);
  const monthly = useMonthlySeries(12, (to ?? range.to).slice(0, 7));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Analiza tus finanzas en cualquier período y exporta tus datos."
        actions={
          <ExportMenu
            filters={customInvalid ? {} : { date_from: range.from, date_to: range.to }}
            hasFilters
            variant="default"
          />
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:flex-wrap sm:items-end sm:pt-6">
          <div className="grid gap-2 sm:w-56">
            <Label htmlFor="report-preset">Período</Label>
            <Select value={preset} onValueChange={(value) => setPreset(value as Preset)}>
              <SelectTrigger id="report-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRESET_LABELS) as Preset[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PRESET_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" ? (
            <>
              <div className="grid gap-2 sm:w-48">
                <Label htmlFor="report-from">Desde</Label>
                <DatePicker
                  id="report-from"
                  value={custom.from}
                  max={custom.to}
                  onChange={(value) => setCustom((current) => ({ ...current, from: value }))}
                  aria-invalid={customInvalid}
                />
              </div>
              <div className="grid gap-2 sm:w-48">
                <Label htmlFor="report-to">Hasta</Label>
                <DatePicker
                  id="report-to"
                  value={custom.to}
                  min={custom.from}
                  onChange={(value) => setCustom((current) => ({ ...current, to: value }))}
                  aria-invalid={customInvalid}
                  aria-describedby={customInvalid ? "report-range-error" : undefined}
                />
              </div>
              {customInvalid && (
                <p
                  id="report-range-error"
                  role="alert"
                  className="text-sm text-destructive sm:pb-2.5"
                >
                  Revisa el rango: la fecha “desde” debe ser anterior a “hasta”.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground sm:pb-2.5">
              {formatDate(range.from)} – {formatDate(range.to)}
            </p>
          )}
        </CardContent>
      </Card>

      {period.isError ? (
        <Card>
          <ErrorState title="No pudimos cargar el reporte" onRetry={() => void period.refetch()} />
        </Card>
      ) : !period.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
            period.isPlaceholderData && "opacity-60 transition-opacity",
          )}
        >
          <StatCard
            label="Ingresos"
            icon={ArrowUpRight}
            value={<CurrencyDisplay value={period.data.totals.income} currency={user.currency} />}
          />
          <StatCard
            label="Gastos"
            icon={ArrowDownRight}
            value={<CurrencyDisplay value={period.data.totals.expense} currency={user.currency} />}
          />
          <StatCard
            label="Balance del período"
            icon={Scale}
            value={
              <CurrencyDisplay
                value={period.data.totals.net}
                currency={user.currency}
                signDisplay="always"
              />
            }
            footer={
              <span className="text-xs text-muted-foreground">
                {formatCount(period.data.totals.transaction_count)} movimientos
              </span>
            }
          />
          <StatCard
            label="Tasa de ahorro"
            icon={PiggyBank}
            value={formatPercent(period.data.totals.savings_rate)}
            footer={
              period.data.totals.savings_rate === null ? (
                <span className="text-xs text-muted-foreground">Sin ingresos en el período</span>
              ) : undefined
            }
          />
        </div>
      )}

      <ChartCard
        title="Evolución de los últimos 12 meses"
        description="Hasta el mes de la fecha final del período"
        summary="Gráfico de ingresos, gastos y balance mensual de 12 meses."
        status={monthly.isPending ? "pending" : monthly.isError ? "error" : "success"}
        onRetry={() => void monthly.refetch()}
        legend={<MonthlyEvolutionLegend />}
        chart={() =>
          monthly.data && (
            <MonthlyEvolutionChart items={monthly.data.items} currency={monthly.data.currency} />
          )
        }
        table={() =>
          monthly.data && (
            <MonthlyEvolutionTable items={monthly.data.items} currency={monthly.data.currency} />
          )
        }
        height={300}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownCard type="EXPENSE" from={from} to={to} />
        <BreakdownCard type="INCOME" from={from} to={to} />
      </div>
    </div>
  );
}

function BreakdownCard({
  type,
  from,
  to,
}: {
  type: TransactionType;
  from?: ISODate;
  to?: ISODate;
}) {
  const query = useCategoryBreakdown(type, from, to);
  const isExpense = type === "EXPENSE";
  const status = query.isPending
    ? "pending"
    : query.isError
      ? "error"
      : query.data.items.length === 0
        ? "empty"
        : "success";

  if (status === "pending" || status === "error" || status === "empty") {
    return (
      <ChartCard
        title={isExpense ? "Gastos por categoría" : "Ingresos por categoría"}
        status={status}
        onRetry={() => void query.refetch()}
        emptyTitle={isExpense ? "Sin gastos en el período" : "Sin ingresos en el período"}
        emptyDescription="Prueba con otro período."
      />
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{isExpense ? "Gastos por categoría" : "Ingresos por categoría"}</CardTitle>
        <CardDescription>
          {formatCount(query.data?.items.length ?? 0)} categorías con movimientos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.data && (
          <CategoryDonut
            breakdown={query.data}
            totalLabel={isExpense ? "Total gastos" : "Total ingresos"}
          />
        )}
      </CardContent>
    </Card>
  );
}
