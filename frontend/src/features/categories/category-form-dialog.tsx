import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CategoryIcon } from "@/components/category-icon";
import { TypeToggle } from "@/components/type-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from "@/lib/category-icons";
import { applyFieldErrors, errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Category, TransactionType } from "@/types/api";

import { useCreateCategory, useUpdateCategory } from "./hooks";

const COLOR_SWATCHES = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

const schema = z.object({
  name: z.string().trim().min(1, "Ingresa un nombre.").max(50, "Máximo 50 caracteres."),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un color."),
  icon: z.string().refine((value) => value in CATEGORY_ICONS, "Elige un ícono."),
});
type Values = z.infer<typeof schema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  defaultType?: TransactionType;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultType = "EXPENSE",
}: CategoryFormDialogProps) {
  const isEdit = Boolean(category);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const pending = createMutation.isPending || updateMutation.isPending;
  const typeLocked = Boolean(category && category.transaction_count > 0);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: defaultType, color: COLOR_SWATCHES[8], icon: "sparkles" },
  });
  const { register, handleSubmit, control, reset, setError, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? { name: category.name, type: category.type, color: category.color, icon: category.icon }
        : { name: "", type: defaultType, color: COLOR_SWATCHES[8] ?? "#0ea5e9", icon: "sparkles" },
    );
  }, [open, category, defaultType, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (category) {
        await updateMutation.mutateAsync({ id: category.id, payload: values });
        toast.success("Categoría actualizada");
      } else {
        await createMutation.mutateAsync(values);
        toast.success("Categoría creada");
      }
      onOpenChange(false);
    } catch (error) {
      if (!applyFieldErrors(error, setError, ["name", "type", "color", "icon"])) {
        toast.error(errorMessage(error));
      }
    }
  });

  const [color, icon, name] = useWatch({ control, name: ["color", "icon", "name"] });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            Las categorías te ayudan a entender en qué gastas y de dónde vienen tus ingresos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
            <CategoryIcon icon={icon} color={color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-medium">{name.trim() || "Vista previa"}</p>
              <p className="text-xs text-muted-foreground">Así se verá en tus movimientos</p>
            </div>
          </div>

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid gap-2">
                <span className="text-sm font-medium" id="category-type-label">
                  Tipo
                </span>
                <TypeToggle
                  value={field.value}
                  onChange={field.onChange}
                  disabled={typeLocked}
                  labelledBy="category-type-label"
                />
                {typeLocked && (
                  <p className="text-xs text-muted-foreground">
                    No se puede cambiar el tipo porque la categoría tiene movimientos.
                  </p>
                )}
              </div>
            )}
          />

          <FormField id="category-name" label="Nombre" error={formState.errors.name?.message}>
            {(props) => (
              <Input
                {...props}
                {...register("name")}
                placeholder="Ej: Mascotas"
                maxLength={50}
                autoComplete="off"
              />
            )}
          </FormField>

          <Controller
            control={control}
            name="color"
            render={({ field, fieldState }) => (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Color</legend>
                <div className="flex flex-wrap gap-2">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => field.onChange(swatch)}
                      aria-label={`Color ${swatch}`}
                      aria-pressed={field.value.toLowerCase() === swatch}
                      className="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-foreground"
                      style={{ backgroundColor: swatch }}
                    >
                      {field.value.toLowerCase() === swatch && (
                        <Check className="size-4 text-white" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                  <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed text-xs text-muted-foreground hover:bg-accent">
                    <span aria-hidden="true">+</span>
                    <span className="sr-only">Color personalizado</span>
                    <input
                      type="color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
                {fieldState.error && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </fieldset>
            )}
          />

          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Ícono</legend>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
                  {CATEGORY_ICON_NAMES.map((iconName) => {
                    const Icon = CATEGORY_ICONS[iconName];
                    if (!Icon) return null;
                    const selected = field.value === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => field.onChange(iconName)}
                        aria-label={`Ícono ${iconName}`}
                        aria-pressed={selected}
                        className={cn(
                          "grid aspect-square place-items-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          selected && "border-foreground bg-accent text-foreground",
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
