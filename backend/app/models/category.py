from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, UniqueConstraint, Uuid, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import TransactionType
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.transaction import Transaction
    from app.models.user import User


class Category(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("user_id", "type", "name"),
        Index("ix_categories_user_id_type", "user_id", "type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
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
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    icon: Mapped[str] = mapped_column(String(40), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    user: Mapped[User] = relationship(back_populates="categories")
    transactions: Mapped[list[Transaction]] = relationship(back_populates="category")

    def __repr__(self) -> str:
        return f"Category(id={self.id!s}, type={self.type})"
