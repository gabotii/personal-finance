from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import TransactionType
from app.core.errors import NotFoundError, ValidationError
from app.core.money import fits_currency, to_money
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories.category_repository import CategoryRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.common import Page
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilters,
    TransactionListParams,
    TransactionRead,
    TransactionUpdate,
)


def validate_filters(filters: TransactionFilters) -> None:
    fields: dict[str, str] = {}
    if filters.date_from and filters.date_to and filters.date_from > filters.date_to:
        fields["date_to"] = "La fecha hasta debe ser posterior a la fecha desde."
    if (
        filters.min_amount is not None
        and filters.max_amount is not None
        and filters.min_amount > filters.max_amount
    ):
        fields["max_amount"] = "El monto máximo debe ser mayor o igual al mínimo."
    if fields:
        raise ValidationError(details={"fields": fields})


class TransactionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.transactions = TransactionRepository(db)
        self.categories = CategoryRepository(db)

    def list(self, user: User, params: TransactionListParams) -> Page[TransactionRead]:
        filters = params.filters()
        validate_filters(filters)
        items, total = self.transactions.list_page(
            user.id,
            filters,
            sort=params.sort,
            page=params.page,
            page_size=params.page_size,
        )
        return Page[TransactionRead].build(
            [TransactionRead.model_validate(item) for item in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    def get(self, user: User, transaction_id: uuid.UUID) -> TransactionRead:
        return TransactionRead.model_validate(self._get_owned(user, transaction_id))

    def create(self, user: User, data: TransactionCreate) -> TransactionRead:
        category = self._get_category(user, data.category_id, require_active=True)
        self._check_consistency(user, data.type, category, data.amount)
        transaction = self.transactions.add(
            Transaction(
                user_id=user.id,
                category_id=category.id,
                type=data.type,
                amount=to_money(data.amount),
                description=data.description,
                notes=data.notes,
                transaction_date=data.transaction_date,
            )
        )
        self.db.commit()
        return self.get(user, transaction.id)

    def update(
        self, user: User, transaction_id: uuid.UUID, data: TransactionUpdate
    ) -> TransactionRead:
        transaction = self._get_owned(user, transaction_id)
        changes = data.model_dump(exclude_unset=True)

        for required in ("type", "amount", "description", "category_id", "transaction_date"):
            if required in changes and changes[required] is None:
                raise ValidationError(
                    details={"fields": {required: "Este campo no puede quedar vacío."}}
                )

        category = transaction.category
        if "category_id" in changes and changes["category_id"] != transaction.category_id:
            category = self._get_category(user, changes["category_id"], require_active=True)

        new_type = changes.get("type", transaction.type)
        new_amount = changes.get("amount", transaction.amount)
        self._check_consistency(user, new_type, category, new_amount)

        if "amount" in changes:
            changes["amount"] = to_money(changes["amount"])
        for field, value in changes.items():
            setattr(transaction, field, value)
        transaction.category = category
        self.db.commit()
        return self.get(user, transaction.id)

    def delete(self, user: User, transaction_id: uuid.UUID) -> None:
        transaction = self._get_owned(user, transaction_id)
        self.transactions.delete(transaction)
        self.db.commit()

    # ---------------------------------------------------------------- helpers

    def _get_owned(self, user: User, transaction_id: uuid.UUID) -> Transaction:
        transaction = self.transactions.get(user.id, transaction_id)
        if transaction is None:
            # Same response whether it does not exist or belongs to someone else.
            raise NotFoundError("El movimiento no existe.")
        return transaction

    def _get_category(
        self, user: User, category_id: uuid.UUID, *, require_active: bool
    ) -> Category:
        category = self.categories.get(user.id, category_id)
        if category is None:
            raise ValidationError(
                "La categoría no existe.",
                details={"fields": {"category_id": "Selecciona una categoría válida."}},
            )
        if require_active and not category.is_active:
            raise ValidationError(
                "La categoría está desactivada.",
                details={"fields": {"category_id": "La categoría está desactivada."}},
            )
        return category

    @staticmethod
    def _check_consistency(
        user: User, type_: TransactionType, category: Category, amount: Decimal
    ) -> None:
        fields: dict[str, str] = {}
        if category.type != type_:
            fields["category_id"] = "La categoría no corresponde al tipo de movimiento."
        if not fits_currency(amount, user.currency):
            fields["amount"] = (
                f"{user.currency.value} no admite decimales."
                if user.currency.decimal_places == 0
                else f"{user.currency.value} admite hasta "
                f"{user.currency.decimal_places} decimales."
            )
        if fields:
            raise ValidationError(details={"fields": fields})
