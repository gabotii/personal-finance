from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class UserSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Server-side session. The cookie carries the token; only its SHA-256 is stored."""

    __tablename__ = "user_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, index=True)
    last_used_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")

    def __repr__(self) -> str:
        return f"UserSession(id={self.id!s}, user_id={self.user_id!s})"
