from __future__ import annotations

import uuid
from collections.abc import Iterable

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.enums import TransactionType
from app.models.category import Category
from app.models.transaction import Transaction


class CategoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_with_counts(
        self,
        user_id: uuid.UUID,
        *,
        type_: TransactionType | None = None,
        include_inactive: bool = True,
    ) -> list[tuple[Category, int]]:
        """Categories plus the number of transactions each one has, in a single query."""
        counts = (
            select(Transaction.category_id, func.count(Transaction.id).label("count"))
            .where(Transaction.user_id == user_id)
            .group_by(Transaction.category_id)
            .subquery()
        )
        stmt = (
            select(Category, func.coalesce(counts.c.count, 0))
            .outerjoin(counts, counts.c.category_id == Category.id)
            .where(Category.user_id == user_id)
            .order_by(Category.type, Category.is_active.desc(), func.lower(Category.name))
        )
        if type_ is not None:
            stmt = stmt.where(Category.type == type_)
        if not include_inactive:
            stmt = stmt.where(Category.is_active.is_(True))
        return [(category, int(count)) for category, count in self.db.execute(stmt).all()]

    def get(self, user_id: uuid.UUID, category_id: uuid.UUID) -> Category | None:
        return self.db.scalar(
            select(Category).where(Category.id == category_id, Category.user_id == user_id)
        )

    def find_by_name(
        self,
        user_id: uuid.UUID,
        type_: TransactionType,
        name: str,
        *,
        exclude_id: uuid.UUID | None = None,
    ) -> Category | None:
        stmt = select(Category).where(
            Category.user_id == user_id,
            Category.type == type_,
            func.lower(Category.name) == name.lower(),
        )
        if exclude_id is not None:
            stmt = stmt.where(Category.id != exclude_id)
        return self.db.scalar(stmt.limit(1))

    def add(self, category: Category) -> Category:
        self.db.add(category)
        self.db.flush()
        return category

    def add_all(self, categories: Iterable[Category]) -> None:
        self.db.add_all(list(categories))
        self.db.flush()

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.flush()

    def count_transactions(self, user_id: uuid.UUID, category_id: uuid.UUID) -> int:
        stmt = select(func.count(Transaction.id)).where(
            Transaction.user_id == user_id, Transaction.category_id == category_id
        )
        return int(self.db.scalar(stmt) or 0)

    def reassign_transactions(
        self, user_id: uuid.UUID, from_category_id: uuid.UUID, to_category_id: uuid.UUID
    ) -> int:
        result = self.db.execute(
            update(Transaction)
            .where(Transaction.user_id == user_id, Transaction.category_id == from_category_id)
            .values(category_id=to_category_id)
            .execution_options(synchronize_session=False)
        )
        return int(getattr(result, "rowcount", 0) or 0)
