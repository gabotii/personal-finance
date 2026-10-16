import * as React from "react";

import { cn } from "@/lib/utils";

import { inputClassName } from "./input";

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Native date input, styled. Native pickers are accessible by default and give the best
 * experience on mobile (OS wheel/calendar), which matters for quick entry.
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, value, onChange, ...props }, ref) => (
    <input
      ref={ref}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        inputClassName,
        "dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
DatePicker.displayName = "DatePicker";
