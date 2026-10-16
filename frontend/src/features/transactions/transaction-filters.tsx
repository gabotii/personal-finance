import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/features/auth/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { parseAmountInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TransactionListParams, TransactionSort, TransactionType } from "@/types/api";

const ALL = "all";

const SORT_LABELS: Record<TransactionSort, string> = {
  date_desc: "Más recientes",
  date_asc: "Más antiguos",
  amount_desc: "Mayor monto",
  amount_asc: "Menor monto",
};

interface TransactionFiltersBarProps {
  params: TransactionListParams;
  onChange: (patch: Partial<TransactionListParams>) => void;
  onClear: () => void;
  activeCount: number;
}

export function TransactionFiltersBar({
  params,
  onChange,
  onClear,
  activeCount,
}: TransactionFiltersBarProps) {
  const user = useUser();
  const categories = useCategories();
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  // Search is typed locally and pushed to the URL after a short pause.
  const [search, setSearch] = useState(params.q ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    if (next !== params.q) onChange({ q: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to the debounced text
  }, [debouncedSearch]);
  // External changes (e.g. "Limpiar filtros") reset the box; our own commits do not.
  const [syncedQ, setSyncedQ] = useState(params.q);
  if (params.q !== syncedQ) {
    setSyncedQ(params.q);
    if ((search.trim() || undefined) !== params.q) setSearch(params.q ?? "");
  }

  const visibleCategories = (categories.data ?? []).filter(
    (category) => !params.type || category.type === params.type,
  );
  const advancedCount = activeCount - (params.q ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por descripción, nota o categoría"
            aria-label="Buscar movimientos"
            className="pl-9"
            maxLength={100}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={params.sort}
            onValueChange={(value) => onChange({ sort: value as TransactionSort })}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as TransactionSort[]).map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="shrink-0"
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtros
            {advancedCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">
                {advancedCount}
                <span className="sr-only"> activos</span>
              </span>
            )}
          </Button>
        </div>
      </div>

      <div
        id={panelId}
        hidden={!expanded}
        className={cn("rounded-xl border bg-muted/30 p-4", expanded && "animate-fade-up")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="grid gap-2">
            <Label htmlFor="filter-type">Tipo</Label>
            <Select
              value={params.type ?? ALL}
              onValueChange={(value) => {
                const type = value === ALL ? undefined : (value as TransactionType);
                const keepCategory = (categories.data ?? []).some(
                  (category) =>
                    category.id === params.category_id && (!type || category.type === type),
                );
                onChange({ type, category_id: keepCategory ? params.category_id : undefined });
              }}
            >
              <SelectTrigger id="filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="EXPENSE">Gastos</SelectItem>
                <SelectItem value="INCOME">Ingresos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-category">Categoría</Label>
            <Select
              value={params.category_id ?? ALL}
              onValueChange={(value) =>
                onChange({ category_id: value === ALL ? undefined : value })
              }
            >
              <SelectTrigger id="filter-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                <SelectSeparator />
                {visibleCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                    {category.name}
                    {!params.type && (
                      <span className="text-xs text-muted-foreground">
                        {category.type === "INCOME" ? "· Ingreso" : "· Gasto"}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-from">Desde</Label>
            <DatePicker
              id="filter-from"
              value={params.date_from ?? ""}
              max={params.date_to}
              onChange={(value) => onChange({ date_from: value || undefined })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="filter-to">Hasta</Label>
            <DatePicker
              id="filter-to"
              value={params.date_to ?? ""}
              min={params.date_from}
              onChange={(value) => onChange({ date_to: value || undefined })}
            />
          </div>

          <AmountFilter
            id="filter-min"
            label="Monto mínimo"
            value={params.min_amount}
            currency={user.currency}
            onCommit={(value) => onChange({ min_amount: value })}
          />
          <AmountFilter
            id="filter-max"
            label="Monto máximo"
            value={params.max_amount}
            currency={user.currency}
            onCommit={(value) => onChange({ max_amount: value })}
          />
        </div>
        {activeCount > 0 && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClear}>
              <RotateCcw aria-hidden="true" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {activeCount > 0 && !expanded && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {activeCount === 1 ? "1 filtro activo" : `${activeCount} filtros activos`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2">
            <X aria-hidden="true" />
            Limpiar
          </Button>
        </div>
      )}
    </div>
  );
}

interface AmountFilterProps {
  id: string;
  label: string;
  value: string | undefined;
  currency: "CLP" | "USD" | "EUR";
  onCommit: (value: string | undefined) => void;
}

function AmountFilter({ id, label, value, currency, onCommit }: AmountFilterProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value ?? "");
    setInvalid(false);
  }

  const commit = () => {
    if (!draft.trim()) {
      setInvalid(false);
      if (value !== undefined) onCommit(undefined);
      return;
    }
    const parsed = parseAmountInput(draft, currency);
    setInvalid(parsed === null);
    if (parsed !== null && parsed !== value) onCommit(parsed);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        placeholder="0"
      />
      {invalid && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          Monto inválido
        </p>
      )}
    </div>
  );
}
