import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/category-icon";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/errors";
import { formatCount } from "@/lib/format";
import type { Category } from "@/types/api";

import { useDeleteCategory, useUpdateCategory } from "./hooks";

interface DeleteCategoryDialogProps {
  category: Category | null;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
}

/**
 * Categories in use cannot be deleted silently: the person chooses where their
 * transactions go (same type), or deactivates the category instead.
 */
export function DeleteCategoryDialog({
  category,
  categories,
  onOpenChange,
}: DeleteCategoryDialogProps) {
  const deleteMutation = useDeleteCategory();
  const updateMutation = useUpdateCategory();
  const [target, setTarget] = useState<string>("");

  const inUse = (category?.transaction_count ?? 0) > 0;
  const candidates = useMemo(
    () => categories.filter((c) => category && c.type === category.type && c.id !== category.id),
    [categories, category],
  );

  const [targetFor, setTargetFor] = useState(category?.id);
  if (category?.id !== targetFor) {
    setTargetFor(category?.id);
    setTarget("");
  }

  if (!category) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: category.id, reassignTo: inUse ? target : undefined });
      toast.success("Categoría eliminada", {
        description: inUse
          ? `${formatCount(category.transaction_count)} movimientos fueron reasignados.`
          : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleDeactivate = async () => {
    try {
      await updateMutation.mutateAsync({ id: category.id, payload: { is_active: false } });
      toast.success("Categoría desactivada");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AlertDialog open={Boolean(category)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar “{category.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {inUse
              ? `Esta categoría tiene ${formatCount(category.transaction_count)} movimientos. Elige a qué categoría moverlos antes de eliminarla, o desactívala para conservar el historial.`
              : "Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {inUse && (
          <div className="grid gap-2">
            <Label htmlFor="reassign-target">Mover movimientos a</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="reassign-target">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    <CategoryIcon icon={candidate.icon} color={candidate.color} size="sm" />
                    {candidate.name}
                    {!candidate.is_active && " (inactiva)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {inUse && category.is_active && (
            <Button variant="outline" onClick={handleDeactivate} loading={updateMutation.isPending}>
              Desactivar
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteMutation.isPending}
            disabled={inUse && !target}
          >
            {inUse ? "Mover y eliminar" : "Eliminar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
