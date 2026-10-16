from __future__ import annotations

import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import ColumnElement, Select, and_, extract, func, or_, select
from sqlalchemy.orm import Session, contains_eager

from app.core.enums import TransactionSort, TransactionType
from app.core.money import to_money
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionFilters

LIKE_ESCAPE = "\\"


def _like_pattern(text: str) -> str:
    escaped = (
        text.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2)
        .replace("%", f"{LIKE_ESCAPE}%")
        .replace("_", f"{LIKE_ESCAPE}_")
    )
    return f"%{escaped}%"


@dataclass(frozen=True, slots=True)
class TypeTotals:
    income: Decimal
    expense: Decimal
    income_count: int
    expense_count: int

    @property
    def net(self) -> Decimal:
        return self.income - self.expense

    @property
    def count(self) -> int:
        return self.income_count + self.expense_count


@dataclass(frozen=True, slots=True)
class CategoryTotal:
    category_id: uuid.UUID
    name: str
    color: str
    icon: str
    total: Decimal
    count: int


class TransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ queries

    def _filter_conditions(
        self, user_id: uuid.UUID, filters: TransactionFilters
    ) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = [Transaction.user_id == user_id]
        if filters.date_from is not None:
            conditions.append(Transaction.transaction_date >= filters.date_from)
        if filters.date_to is not None:
            conditions.append(Transaction.transaction_date <= filters.date_to)
        if filters.type is not None:
            conditions.append(Transaction.type == filters.type)
        if filters.category_id is not None:
            conditions.append(Transaction.category_id == filters.category_id)
        if filters.min_amount is not None:
            conditions.append(Transaction.amount >= filters.min_amount)
        if filters.max_amount is not None:
            conditions.append(Transaction.amount <= filters.max_amount)
        if filters.q:
            pattern = _like_pattern(filters.q)
            conditions.append(
                or_(
                    Transaction.description.ilike(pattern, escape=LIKE_ESCAPE),
                    Transaction.notes.ilike(pattern, escape=LIKE_ESCAPE),
                    Category.name.ilike(pattern, escape=LIKE_ESCAPE),
                )
            )
        return conditions

    def _base_query(self, user_id: uuid.UUID, filters: TransactionFilters) -> Select[Any]:
        # The inner join both loads the category (no N+1) and allows searching by its name.
        return (
            select(Transaction)
            .join(Transaction.category)
            .options(contains_eager(Transaction.category))
            .where(*self._filter_conditions(user_id, filters))
        )

    @staticmethod
    def _order_by(sort: TransactionSort) -> list[Any]:
        tie_breakers = [Transaction.created_at.desc(), Transaction.id.desc()]
        match sort:
            case TransactionSort.DATE_ASC:
                return [Transaction.transaction_date.asc(), *tie_breakers]
            case TransactionSort.AMOUNT_DESC:
                return [
                    Transaction.amount.desc(),
                    Transaction.transaction_date.desc(),
                    *tie_breakers,
                ]
            case TransactionSort.AMOUNT_ASC:
                return [
                    Transaction.amount.asc(),
                    Transaction.transaction_date.desc(),
                    *tie_breakers,
                ]
            case _:
                return [Transaction.transaction_date.desc(), *tie_breakers]

    def count(self, user_id: uuid.UUID, filters: TransactionFilters) -> int:
        stmt = (
            select(func.count(Transaction.id))
            .select_from(Transaction)
            .join(Transaction.category)
            .where(*self._filter_conditions(user_id, filters))
        )
        return int(self.db.scalar(stmt) or 0)

    def list_page(
        self,
        user_id: uuid.UUID,
        filters: TransactionFilters,
        *,
        sort: TransactionSort,
        page: int,
        page_size: int,
    ) -> tuple[list[Transaction], int]:
        total = self.count(user_id, filters)
        if total == 0:
            return [], 0
        stmt = (
            self._base_query(user_id, filters)
            .order_by(*self._order_by(sort))
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        return list(self.db.scalars(stmt).unique().all()), total

    def list_all(
        self, user_id: uuid.UUID, filters: TransactionFilters, *, limit: int | None = None
    ) -> list[Transaction]:
        stmt = self._base_query(user_id, filters).order_by(
            *self._order_by(TransactionSort.DATE_DESC)
        )
        if limit is not None:
            stmt = stmt.limit(limit)
        return list(self.db.scalars(stmt).unique().all())

    def iter_batches(
        self, user_id: uuid.UUID, filters: TransactionFilters, *, batch_size: int = 1000
    ) -> Iterator[list[Transaction]]:
        """Keyset-paginated iteration (date desc, id desc) for streaming exports.

        Each batch is an independent query, so no server-side cursor stays open while the
        response is being streamed to a slow client.
        """
        last: tuple[date, uuid.UUID] | None = None
        while True:
            stmt = self._base_query(user_id, filters).order_by(
                Transaction.transaction_date.desc(), Transaction.id.desc()
            )
            if last is not None:
                last_date, last_id = last
                stmt = stmt.where(
                    or_(
                        Transaction.transaction_date < last_date,
                        and_(Transaction.transaction_date == last_date, Transaction.id < last_id),
                    )
                )
            batch = list(self.db.scalars(stmt.limit(batch_size)).unique().all())
            if not batch:
                return
            yield batch
            if len(batch) < batch_size:
                return
            last = (batch[-1].transaction_date, batch[-1].id)

    def get(self, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction | None:
        stmt = (
            select(Transaction)
            .join(Transaction.category)
            .options(contains_eager(Transaction.category))
            .where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        )
        return self.db.scalar(stmt)

    # ------------------------------------------------------------------ writes

    def add(self, transaction: Transaction) -> Transaction:
        self.db.add(transaction)
        self.db.flush()
        return transaction

    def delete(self, transaction: Transaction) -> None:
        self.db.delete(transaction)
        self.db.flush()

    # ------------------------------------------------------------- aggregates

    def totals_by_type(
        self,
        user_id: uuid.UUID,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        filters: TransactionFilters | None = None,
    ) -> TypeTotals:
        conditions = (
            self._filter_conditions(user_id, filters)
            if filters is not None
            else [Transaction.user_id == user_id]
        )
        if date_from is not None:
            conditions.append(Transaction.transaction_date >= date_from)
        if date_to is not None:
            conditions.append(Transaction.transaction_date <= date_to)
        stmt = (
            select(Transaction.type, func.sum(Transaction.amount), func.count(Transaction.id))
            .select_from(Transaction)
            .join(Transaction.category)
            .where(*conditions)
            .group_by(Transaction.type)
        )
        sums: dict[TransactionType, tuple[Decimal, int]] = {}
        for type_, total, count in self.db.execute(stmt).all():
            sums[TransactionType(type_)] = (to_money(total), int(count))
        income, income_count = sums.get(TransactionType.INCOME, (to_money(0), 0))
        expense, expense_count = sums.get(TransactionType.EXPENSE, (to_money(0), 0))
        return TypeTotals(income, expense, income_count, expense_count)

    def monthly_totals(
        self, user_id: uuid.UUID, date_from: date, date_to: date
    ) -> dict[tuple[int, int], dict[TransactionType, Decimal]]:
        year = extract("year", Transaction.transaction_date)
        month = extract("month", Transaction.transaction_date)
        stmt = (
            select(year, month, Transaction.type, func.sum(Transaction.amount))
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= date_from,
                Transaction.transaction_date <= date_to,
            )
            .group_by(year, month, Transaction.type)
        )
        result: dict[tuple[int, int], dict[TransactionType, Decimal]] = {}
        for y, m, type_, total in self.db.execute(stmt).all():
            result.setdefault((int(y), int(m)), {})[TransactionType(type_)] = to_money(total)
        return result

    def daily_totals(
        self, user_id: uuid.UUID, date_from: date, date_to: date
    ) -> dict[date, dict[TransactionType, Decimal]]:
        stmt = (
            select(Transaction.transaction_date, Transaction.type, func.sum(Transaction.amount))
            .where(
                Transaction.user_id == user_id,
                Transaction.transaction_date >= date_from,
                Transaction.transaction_date <= date_to,
            )
            .group_by(Transaction.transaction_date, Transaction.type)
        )
        result: dict[date, dict[TransactionType, Decimal]] = {}
        for day, type_, total in self.db.execute(stmt).all():
            result.setdefault(day, {})[TransactionType(type_)] = to_money(total)
        return result

    def category_totals(
        self,
        user_id: uuid.UUID,
        *,
        type_: TransactionType | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        filters: TransactionFilters | None = None,
    ) -> list[tuple[TransactionType, CategoryTotal]]:
        conditions = (
            self._filter_conditions(user_id, filters)
            if filters is not None
            else [Transaction.user_id == user_id]
        )
        if type_ is not None:
            conditions.append(Transaction.type == type_)
        if date_from is not None:
            conditions.append(Transaction.transaction_date >= date_from)
        if date_to is not None:
            conditions.append(Transaction.transaction_date <= date_to)
        total = func.sum(Transaction.amount)
        stmt = (
            select(
                Transaction.type,
                Category.id,
                Category.name,
                Category.color,
                Category.icon,
                total,
                func.count(Transaction.id),
            )
            .select_from(Transaction)
            .join(Transaction.category)
            .where(*conditions)
            .group_by(Transaction.type, Category.id, Category.name, Category.color, Category.icon)
            .order_by(total.desc(), Category.name)
        )
        return [
            (
                TransactionType(row_type),
                CategoryTotal(
                    category_id=category_id,
                    name=name,
                    color=color,
                    icon=icon,
                    total=to_money(row_total),
                    count=int(count),
                ),
            )
            for row_type, category_id, name, color, icon, row_total, count in self.db.execute(
                stmt
            ).all()
        ]
