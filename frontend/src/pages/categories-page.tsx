import { EllipsisVertical, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryFormDialog } from "@/features/categories/category-form-dialog";
import { DeleteCategoryDialog } from "@/features/categories/delete-category-dialog";
import { useCategories, useUpdateCategory } from "@/features/categories/hooks";
import { errorMessage } from "@/lib/errors";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, TransactionType } from "@/types/api";

const SECTIONS: { type: TransactionType; title: string; description: string }[] = [
  { type: "EXPENSE", title: "Gastos", description: "En qué usas tu dinero" },
  { type: "INCOME", title: "Ingresos", description: "De dónde viene tu dinero" },
];

export function CategoriesPage() {
  const categories = useCategories();
  const [formState, setFormState] = useState<{
    open: boolean;
    category: Category | null;
    type: TransactionType;
  }>({ open: false, category: null, type: "EXPENSE" });
  const [deleting, setDeleting] = useState<Category | null>(null);

  const openCreate = (type: TransactionType) => setFormState({ open: true, category: null, type });
  const openEdit = (category: Category) =>
    setFormState({ open: true, category, type: category.type });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Organiza tus movimientos. Desactiva las que no uses sin perder el historial."
        actions={
          <Button onClick={() => openCreate("EXPENSE")}>
            <Plus aria-hidden="true" />
            Nueva categoría
          </Button>
        }
      />

      {categories.isError ? (
        <Card>
          <ErrorState
            title="No pudimos cargar tus categorías"
            onRetry={() => void categories.refetch()}
            retrying={categories.isFetching}
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {SECTIONS.map((section) => {
            const items = (categories.data ?? []).filter((c) => c.type === section.type);
            return (
              <Card key={section.type} className="min-w-0">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openCreate(section.type)}>
                    <Plus aria-hidden="true" />
                    Agregar
                  </Button>
                </CardHeader>
                <CardContent className="px-2 sm:px-3">
                  {categories.isPending ? (
                    <ul className="divide-y">
                      {Array.from({ length: 5 }, (_, index) => (
                        <li key={index} className="flex items-center gap-3 px-3 py-3">
                          <Skeleton className="size-9 rounded-xl" />
                          <Skeleton className="h-4 w-40" />
                        </li>
                      ))}
                    </ul>
                  ) : items.length === 0 ? (
                    <EmptyState
                      compact
                      title={`No tienes categorías de ${section.title.toLowerCase()}`}
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCreate(section.type)}
                        >
                          Crear categoría
                        </Button>
                      }
                    />
                  ) : (
                    <ul
                      className="divide-y"
                      aria-label={`Categorías de ${section.title.toLowerCase()}`}
                    >
                      {items.map((category) => (
                        <CategoryRow
                          key={category.id}
                          category={category}
                          onEdit={() => openEdit(category)}
                          onDelete={() => setDeleting(category)}
                        />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CategoryFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((state) => ({ ...state, open }))}
        category={formState.category}
        defaultType={formState.type}
      />
      <DeleteCategoryDialog
        category={deleting}
        categories={categories.data ?? []}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  );
}

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const update = useUpdateCategory();

  const toggleActive = () => {
    update.mutate(
      { id: category.id, payload: { is_active: !category.is_active } },
      {
        onSuccess: () =>
          toast.success(category.is_active ? "Categoría desactivada" : "Categoría activada"),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  return (
    <li className={cn("flex items-center gap-3 px-3 py-3", !category.is_active && "opacity-60")}>
      <CategoryIcon icon={category.icon} color={category.color} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          <span className="truncate">{category.name}</span>
          {!category.is_active && <Badge variant="muted">Inactiva</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          {category.transaction_count === 0
            ? "Sin movimientos"
            : category.transaction_count === 1
              ? "1 movimiento"
              : `${formatCount(category.transaction_count)} movimientos`}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${category.name}`}>
            <EllipsisVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil aria-hidden="true" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleActive} disabled={update.isPending}>
            {category.is_active ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
            {category.is_active ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
