import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  footer?: ReactNode;
  emphasis?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, footer, emphasis, className }: StatCardProps) {
  return (
    <Card className={cn("flex min-w-0 animate-fade-up flex-col gap-3 p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p
        className={cn(
          "truncate font-semibold tracking-tight",
          emphasis ? "text-[28px] leading-9 sm:text-[32px]" : "text-2xl leading-8",
        )}
      >
        {value}
      </p>
      {footer && <div className="min-h-4">{footer}</div>}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-3.5 w-32" />
    </Card>
  );
}
