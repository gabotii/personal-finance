import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shiftMonth } from "@/lib/dates";
import { formatMonth } from "@/lib/format";
import type { MonthKey } from "@/types/api";

interface MonthNavigatorProps {
  month: MonthKey;
  maxMonth: MonthKey;
  onChange: (month: MonthKey) => void;
}

export function MonthNavigator({ month, maxMonth, onChange }: MonthNavigatorProps) {
  const isLatest = month >= maxMonth;
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="min-w-[9.5rem] text-center text-sm font-medium" aria-live="polite">
        {formatMonth(month)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isLatest}
        aria-label="Mes siguiente"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
