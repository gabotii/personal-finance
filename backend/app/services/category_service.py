from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.enums import TransactionType
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.category import Category
from app.models.user import User
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

DEFAULT_CATEGORIES: tuple[tuple[str, TransactionType, str, str], ...] = (
    ("Alimentación", TransactionType.EXPENSE, "#f97316", "utensils"),
    ("Vivienda", TransactionType.EXPENSE, "#6366f1", "home"),
    ("Transporte", TransactionType.EXPENSE, "#0ea5e9", "car"),
    ("Salud", TransactionType.EXPENSE, "#ef4444", "heart-pulse"),
    ("Educación", TransactionType.EXPENSE, "#8b5cf6", "graduation-cap"),
    ("Entretenimiento", TransactionType.EXPENSE, "#ec4899", "clapperboard"),
    ("Compras", TransactionType.EXPENSE, "#f59e0b", "shopping-bag"),
    ("Servicios", TransactionType.EXPENSE, "#14b8a6", "plug"),
    ("Suscripciones", TransactionType.EXPENSE, "#a855f7", "repeat"),
    ("Viajes", TransactionType.EXPENSE, "#06b6d4", "plane"),
    ("Otros", TransactionType.EXPENSE, "#64748b", "circle-ellipsis"),
    ("Salario", TransactionType.INCOME, "#10b981", "briefcase"),
    ("Freelance", TransactionType.INCOME, "#22c55e", "laptop"),
    ("Negocio", TransactionType.INCOME, "#84cc16", "store"),
    ("Inversiones", TransactionType.INCOME, "#059669", "trending-up"),
    ("Otros", TransactionType.INCOME, "#64748b", "circle-ellipsis"),
)


def _to_read(category: Category, transaction_count: int) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        name=category.name,
        type=category.type,
        color=category.color,
        icon=category.icon,
        is_active=category.is_active,
        transaction_count=transaction_count,
        created_at=category.created_at,
        updated_at=category.updated_at,
    )


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.categories = CategoryRepository(db)

    def create_defaults(self, user_id: uuid.UUID) -> None:
        self.categories.add_all(
            Category(user_id=user_id, name=name, type=type_, color=color, icon=icon)
            for name, type_, color, icon in DEFAULT_CATEGORIES
        )

    def list(
        self,
        user: User,
        *,
        type_: TransactionType | None = None,
        include_inactive: bool = True,
    ) -> list[CategoryRead]:
        rows = self.categories.list_with_counts(
            user.id, type_=type_, include_inactive=include_inactive
        )
        return [_to_read(category, count) for category, count in rows]

    def get_owned(self, user: User, category_id: uuid.UUID) -> Category:
        category = self.categories.get(user.id, category_id)
        if category is None:
            raise NotFoundError("La categoría no existe.")
        return category

    def create(self, user: User, data: CategoryCreate) -> CategoryRead:
        self._ensure_unique_name(user.id, data.type, data.name)
        category = self.categories.add(
            Category(
                user_id=user.id,
                name=data.name,
                type=data.type,
                color=data.color,
                icon=data.icon,
                is_active=True,
            )
        )
        self.db.commit()
        return _to_read(category, 0)

    def update(self, user: User, category_id: uuid.UUID, data: CategoryUpdate) -> CategoryRead:
        category = self.get_owned(user, category_id)
        changes = data.model_dump(exclude_unset=True, exclude_none=True)
        transaction_count = self.categories.count_transactions(user.id, category.id)

        new_type = changes.get("type", category.type)
        if new_type != category.type and transaction_count > 0:
            raise ConflictError(
                "No puedes cambiar el tipo de una categoría que tiene movimientos.",
                code="CATEGORY_TYPE_LOCKED",
                details={"transaction_count": transaction_count},
            )
        new_name = changes.get("name", category.name)
        if new_name.lower() != category.name.lower() or new_type != category.type:
            self._ensure_unique_name(user.id, new_type, new_name, exclude_id=category.id)

        for field, value in changes.items():
            setattr(category, field, value)
        self.db.commit()
        self.db.refresh(category)
        return _to_read(category, transaction_count)

    def delete(
        self, user: User, category_id: uuid.UUID, *, reassign_to: uuid.UUID | None = None
    ) -> None:
        category = self.get_owned(user, category_id)
        transaction_count = self.categories.count_transactions(user.id, category.id)

        if transaction_count > 0:
            if reassign_to is None:
                raise ConflictError(
                    "La categoría tiene movimientos asociados. Reasígnalos a otra categoría "
                    "o desactívala.",
                    code="CATEGORY_IN_USE",
                    details={"transaction_count": transaction_count},
                )
            if reassign_to == category.id:
                raise ValidationError(
                    "La categoría de destino debe ser distinta.",
                    details={"fields": {"reassign_to": "Elige otra categoría."}},
                )
            target = self.categories.get(user.id, reassign_to)
            if target is None:
                raise ValidationError(
                    "La categoría de destino no existe.",
                    details={"fields": {"reassign_to": "Categoría no encontrada."}},
                )
            if target.type != category.type:
                raise ValidationError(
                    "La categoría de destino debe ser del mismo tipo.",
                    details={"fields": {"reassign_to": "Debe ser del mismo tipo."}},
                )
            self.categories.reassign_transactions(user.id, category.id, target.id)

        self.categories.delete(category)
        self.db.commit()

    def _ensure_unique_name(
        self,
        user_id: uuid.UUID,
        type_: TransactionType,
        name: str,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        if self.categories.find_by_name(user_id, type_, name, exclude_id=exclude_id):
            raise ConflictError(
                "Ya existe una categoría con ese nombre.",
                code="CATEGORY_EXISTS",
                details={"fields": {"name": "Ya existe una categoría con ese nombre."}},
            )
