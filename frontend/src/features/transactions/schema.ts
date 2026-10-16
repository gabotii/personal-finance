import { z } from "zod";

import { isValidISODate } from "@/lib/dates";
import { CURRENCY_DECIMALS, parseAmountInput } from "@/lib/money";
import type { Currency } from "@/types/api";

export function transactionFormSchema(currency: Currency) {
  return z.object({
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.string().superRefine((value, ctx) => {
      if (!value.trim()) {
        ctx.addIssue({ code: "custom", message: "Ingresa un monto." });
        return;
      }
      if (parseAmountInput(value, currency) === null) {
        const decimals = CURRENCY_DECIMALS[currency];
        ctx.addIssue({
          code: "custom",
          message:
            decimals === 0
              ? `Ingresa un monto mayor a 0, sin decimales (${currency}).`
              : `Ingresa un monto mayor a 0 con hasta ${decimals} decimales.`,
        });
      }
    }),
    description: z
      .string()
      .trim()
      .min(1, "Agrega una descripción.")
      .max(200, "Máximo 200 caracteres."),
    category_id: z.string().min(1, "Selecciona una categoría."),
    transaction_date: z.string().refine(isValidISODate, "Selecciona una fecha válida."),
    notes: z.string().max(2000, "Máximo 2000 caracteres."),
  });
}

export type TransactionFormValues = z.infer<ReturnType<typeof transactionFormSchema>>;
