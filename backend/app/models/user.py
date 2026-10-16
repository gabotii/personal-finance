from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import Currency, ThemePreference
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.transaction import Transaction
    from app.models.user_session import UserSession


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[Currency] = mapped_column(
        Enum(Currency, name="currency", native_enum=False, create_constraint=True, length=3),
        nullable=False,
        default=Currency.CLP,
    )
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="America/Santiago")
    theme: Mapped[ThemePreference] = mapped_column(
        Enum(
            ThemePreference,
            name="theme_preference",
            native_enum=False,
            create_constraint=True,
            length=6,
        ),
        nullable=False,
        default=ThemePreference.SYSTEM,
    )

    categories: Mapped[list[Category]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    transactions: Mapped[list[Transaction]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    sessions: Mapped[list[UserSession]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"User(id={self.id!s})"
