import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { isApiError } from "@/services/api";

export function errorMessage(
  error: unknown,
  fallback = "Algo salió mal. Inténtalo nuevamente.",
): string {
  return isApiError(error) ? error.message : fallback;
}

/**
 * Copies backend field errors (`details.fields`) onto the form. Returns true when at least
 * one field matched, so the caller can decide whether a toast is still needed.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!isApiError(error)) return false;
  let matched = false;
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: "server", message });
      matched = true;
    }
  }
  return matched;
}
