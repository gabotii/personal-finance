import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link } from "react-router";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/category-icon";
import { TypeToggle } from "@/components/type-toggle";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/features/auth/hooks";
import { useCategories } from "@/features/categories/hooks";
import { todayISO } from "@/lib/dates";
import { applyFieldErrors, errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { formatAmountInput, parseAmountInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionPayload, TransactionType } from "@/types/api";

import { useCreateTransaction, useUpdateTransaction } from "./hooks";
import { transactionFormSchema, type TransactionFormValues } from "./schema";

const CURRENCY_PREFIX = { CLP: "$", USD: "US$", EUR: "€" } as const;
const FIELDS = [
  "type",
  "amount",
  "description",
  "category_id",
  "transaction_date",
  "notes",
] as const;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  defaultType: TransactionType;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultType,
}: TransactionFormDialogProps) {
  const user = useUser();
  const currency = user.currency;
  const isEdit = transaction !== null;
  const categoriesQuery = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const pending = createMutation.isPending || updateMutation.isPending;
  const amountRef = useRef<HTMLInputElement | null>(null);
  // Which submit button was used: drives the spinner and whether the dialog stays open.
  const [submitMode, setSubmitMode] = useState<"close" | "another">("close");

  const schema = useMemo(() => transactionFormSchema(currency), [currency]);
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(defaultType, user.timezone),
  });
  const { control, register, handleSubmit, reset, setError, setValue, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      transaction
        ? {
            type: transaction.type,
            amount: formatAmountInput(transaction.amount, currency),
            description: transaction.description,
            category_id: transaction.category.id,
            transaction_date: transaction.transaction_date,
            notes: transaction.notes ?? "",
          }
        : emptyValues(defaultType, user.timezone),
    );
  }, [open, transaction, defaultType, currency, user.timezone, reset]);

  const [type, categoryId] = useWatch({ control, name: ["type", "category_id"] });
  const options = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter(
        (category) =>
          category.type === type &&
          (category.is_active || category.id === transaction?.category.id),
      ),
    [categoriesQuery.data, type, transaction],
  );

  // When the type changes, a category of the other type is no longer valid.
  useEffect(() => {
    if (categoryId && categoriesQuery.data && !options.some((option) => option.id === categoryId)) {
      setValue("category_id", "");
    }
  }, [categoryId, categoriesQuery.data, options, setValue]);

  const save = async (values: TransactionFormValues, addAnother: boolean) => {
    const amount = parseAmountInput(values.amount, currency);
    if (amount === null) return;
    const payload: TransactionPayload = {
      type: values.type,
      amount,
      description: values.description.trim(),
      category_id: values.category_id,
      transaction_date: values.transaction_date,
      notes: values.notes.trim() || null,
    };
    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, payload });
        toast.success("Movimiento actualizado");
        onOpenChange(false);
        return;
      }
      const { data } = await createMutation.mutateAsync(payload);
      toast.success("Movimiento creado", {
        description: `${data.category.name} · ${formatMoney(data.amount, currency)}`,
      });
      if (addAnother) {
        reset({
          ...emptyValues(values.type, user.timezone),
          transaction_date: values.transaction_date,
        });
        amountRef.current?.focus();
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) toast.error(errorMessage(error));
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    // Enter submits with the form's first submit button ("Guardar"), so the default saves and closes.
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const addAnother = submitter?.getAttribute("data-mode") === "another";
    setSubmitMode(addAnother ? "another" : "close");
    void handleSubmit((values) => save(values, addAnother))(event);
  };

  const amountField = register("amount");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          amountRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del movimiento."
              : "Registra un ingreso o un gasto. Solo toma unos segundos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="grid gap-4">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid gap-2">
                <span id="transaction-type-label" className="sr-only">
                  Tipo de movimiento
                </span>
                <TypeToggle
                  value={field.value}
                  onChange={field.onChange}
                  labelledBy="transaction-type-label"
                />
              </div>
            )}
          />

          <FormField id="transaction-amount" label="Monto" error={formState.errors.amount?.message}>
            {(props) => (
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground"
                >
                  {CURRENCY_PREFIX[currency]}
                </span>
                <Input
                  {...props}
                  {...amountField}
                  ref={(element) => {
                    amountField.ref(element);
                    amountRef.current = element;
                  }}
                  onBlur={(event) => {
                    void amountField.onBlur(event);
                    const parsed = parseAmountInput(event.target.value, currency);
                    if (parsed) setValue("amount", formatAmountInput(parsed, currency));
                  }}
                  inputMode={currency === "CLP" ? "numeric" : "decimal"}
                  autoComplete="off"
                  placeholder="0"
                  className={cn(
                    "tabular h-14 text-2xl font-semibold tracking-tight",
                    currency === "CLP" ? "pl-9" : "pl-14",
                  )}
                />
              </div>
            )}
          </FormField>

          <FormField
            id="transaction-description"
            label="Descripción"
            error={formState.errors.description?.message}
          >
            {(props) => (
              <Input
                {...props}
                {...register("description")}
                placeholder={type === "EXPENSE" ? "Ej: Supermercado" : "Ej: Sueldo de octubre"}
                maxLength={200}
                autoComplete="off"
              />
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="category_id"
              render={({ field, fieldState }) => (
                <FormField
                  id="transaction-category"
                  label="Categoría"
                  error={fieldState.error?.message}
                >
                  {(props) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        {...props}
                        ref={field.ref}
                        disabled={categoriesQuery.isPending}
                      >
                        <SelectValue
                          placeholder={categoriesQuery.isPending ? "Cargando…" : "Selecciona"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {options.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground">
                            No hay categorías activas.{" "}
                            <Link
                              to="/categories"
                              className="underline"
                              onClick={() => onOpenChange(false)}
                            >
                              Crear una
                            </Link>
                          </div>
                        ) : (
                          options.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="transaction_date"
              render={({ field, fieldState }) => (
                <FormField id="transaction-date" label="Fecha" error={fieldState.error?.message}>
                  {(props) => (
                    <DatePicker
                      {...props}
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      required
                    />
                  )}
                </FormField>
              )}
            />
          </div>

          <FormField
            id="transaction-notes"
            label="Notas"
            optional
            error={formState.errors.notes?.message}
          >
            {(props) => (
              <Textarea
                {...props}
                {...register("notes")}
                rows={2}
                maxLength={2000}
                placeholder="Información adicional"
              />
            )}
          </FormField>

          <DialogFooter>
            {/* "Guardar" comes first in the DOM (it is the implicit Enter target); CSS order
                keeps the visual order Cancelar · Guardar y agregar otro · Guardar. */}
            <Button
              type="submit"
              data-mode="close"
              loading={pending && submitMode === "close"}
              disabled={pending}
              className="order-3"
            >
              {isEdit ? "Guardar cambios" : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="order-1"
            >
              Cancelar
            </Button>
            {!isEdit && (
              <Button
                type="submit"
                data-mode="another"
                variant="secondary"
                loading={pending && submitMode === "another"}
                disabled={pending}
                className="order-2"
              >
                Guardar y agregar otro
              </Button>
            )}
          </DialogFooter>
          {!isEdit && (
            <p className="hidden text-center text-xs text-muted-foreground sm:block">
              Atajo: presiona <kbd className="rounded border px-1 font-sans">N</kbd> en cualquier
              pantalla para registrar un movimiento.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyValues(type: TransactionType, timeZone: string): TransactionFormValues {
  return {
    type,
    amount: "",
    description: "",
    category_id: "",
    transaction_date: todayISO(timeZone),
    notes: "",
  };
}
