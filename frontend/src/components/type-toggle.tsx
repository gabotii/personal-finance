import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TransactionType } from "@/types/api";

interface TypeToggleProps {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
  disabled?: boolean;
  labelledBy?: string;
}

const OPTIONS: { value: TransactionType; label: string; icon: typeof ArrowUpRight }[] = [
  { value: "EXPENSE", label: "Gasto", icon: ArrowDownRight },
  { value: "INCOME", label: "Ingreso", icon: ArrowUpRight },
];

/** Segmented control implemented as a radio group (arrow keys move between options). */
export function TypeToggle({ value, onChange, disabled, labelledBy }: TypeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
      onKeyDown={(event) => {
        if (disabled) return;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          const next = value === "EXPENSE" ? "INCOME" : "EXPENSE";
          onChange(next);
          const target = event.currentTarget.querySelector<HTMLButtonElement>(
            `[data-value="${next}"]`,
          );
          target?.focus();
        }
      }}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-value={option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-all disabled:cursor-not-allowed disabled:opacity-60",
              selected && "bg-card text-foreground shadow-sm",
            )}
          >
            <Icon
              className={cn(
                "size-4",
                selected && (option.value === "INCOME" ? "text-income-text" : "text-expense"),
              )}
              aria-hidden="true"
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
