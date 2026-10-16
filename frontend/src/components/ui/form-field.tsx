import { CircleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { Label } from "./label";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  description?: string;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}

/**
 * Label + control + description + error, wired for screen readers: the error is linked
 * through aria-describedby and announced with role="alert".
 */
export function FormField({
  id,
  label,
  error,
  description,
  optional,
  className,
  children,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted-foreground">Opcional</span>}
      </Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
