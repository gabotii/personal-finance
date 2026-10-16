import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex animate-fade-up flex-col items-center justify-center gap-4 text-center",
        compact ? "py-8" : "py-16",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl border bg-muted/60 text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
