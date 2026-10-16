import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-foreground" />
        <path
          d="M9 21.5 14 16l3.5 3.5L23 12"
          fill="none"
          stroke="hsl(var(--net))"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="23" cy="12" r="2" className="fill-background" />
      </svg>
      {!compact && <span className="text-[15px]">Finanzas</span>}
    </span>
  );
}
