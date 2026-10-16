from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import TransactionType
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.user import User


class Transaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("ix_transactions_user_id_transaction_date", "user_id", "transaction_date"),
        Index(
            "ix_transactions_user_id_type_transaction_date",
            "user_id",
            "type",
            "transaction_date",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("categories.id"), nullable=False, index=True
    )
    type: Mapped[TransactionType] = mapped_column(
        Enum(
            TransactionType,
            name="transaction_type",
            native_enum=False,
            create_constraint=True,
            length=7,
        ),
        nullable=False,
    )
    # Always positive; the sign is given by `type`.
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2, asdecimal=True), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped[User] = relationship(back_populates="transactions")
    category: Mapped[Category] = relationship(back_populates="transactions")

    def __repr__(self) -> str:
        return f"Transaction(id={self.id!s}, type={self.type}, date={self.transaction_date})"
