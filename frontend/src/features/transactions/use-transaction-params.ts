import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import { isValidISODate } from "@/lib/dates";
import {
  PAGE_SIZES,
  TRANSACTION_SORTS,
  TRANSACTION_TYPES,
  type PageSize,
  type TransactionFilters,
  type TransactionListParams,
  type TransactionSort,
  type TransactionType,
} from "@/types/api";

const FILTER_KEYS = [
  "date_from",
  "date_to",
  "type",
  "category_id",
  "q",
  "min_amount",
  "max_amount",
] as const satisfies readonly (keyof TransactionFilters)[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECIMAL = /^\d{1,12}(\.\d{1,2})?$/;

function parseParams(search: URLSearchParams): TransactionListParams {
  const page = Number(search.get("page"));
  const pageSize = Number(search.get("page_size"));
  const sort = search.get("sort");
  const type = search.get("type");
  const dateFrom = search.get("date_from");
  const dateTo = search.get("date_to");
  const categoryId = search.get("category_id");
  const minAmount = search.get("min_amount");
  const maxAmount = search.get("max_amount");
  const q = search.get("q")?.trim();

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    page_size: (PAGE_SIZES as readonly number[]).includes(pageSize) ? (pageSize as PageSize) : 25,
    sort: (TRANSACTION_SORTS as readonly string[]).includes(sort ?? "")
      ? (sort as TransactionSort)
      : "date_desc",
    type: (TRANSACTION_TYPES as readonly string[]).includes(type ?? "")
      ? (type as TransactionType)
      : undefined,
    date_from: dateFrom && isValidISODate(dateFrom) ? dateFrom : undefined,
    date_to: dateTo && isValidISODate(dateTo) ? dateTo : undefined,
    category_id: categoryId && UUID.test(categoryId) ? categoryId : undefined,
    q: q ? q.slice(0, 100) : undefined,
    min_amount: minAmount && DECIMAL.test(minAmount) ? minAmount : undefined,
    max_amount: maxAmount && DECIMAL.test(maxAmount) ? maxAmount : undefined,
  };
}

/** Listing state lives in the URL: shareable, bookmarkable and back-button friendly. */
export function useTransactionParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);

  const filters = useMemo<TransactionFilters>(() => {
    const result: TransactionFilters = {};
    for (const key of FILTER_KEYS) {
      const value = params[key];
      if (value !== undefined) Object.assign(result, { [key]: value });
    }
    return result;
  }, [params]);

  const update = useCallback(
    (patch: Partial<TransactionListParams>) => {
      setSearchParams(
        (current) => {
          const next = { ...parseParams(current), ...patch };
          // Any filter/sort/page-size change restarts from page 1.
          if (!("page" in patch)) next.page = 1;
          const search = new URLSearchParams();
          for (const [key, value] of Object.entries(next)) {
            if (value === undefined || value === null || value === "") continue;
            if (key === "page" && value === 1) continue;
            if (key === "page_size" && value === 25) continue;
            if (key === "sort" && value === "date_desc") continue;
            search.set(key, String(value));
          }
          return search;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    update(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])));
  }, [update]);

  const activeFilterCount = Object.keys(filters).length;

  return { params, filters, update, clearFilters, activeFilterCount };
}
