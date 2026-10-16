import * as React from "react";

import { cn } from "@/lib/utils";

export const inputClassName =
  "flex h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn(inputClassName, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputClassName, "h-auto min-h-20 resize-y leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";
