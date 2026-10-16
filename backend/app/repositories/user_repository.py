from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, user_id: uuid.UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def email_exists(self, email: str) -> bool:
        return self.db.scalar(select(User.id).where(User.email == email.lower())) is not None

    def add(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user

    def has_fractional_amounts(self, user_id: uuid.UUID) -> bool:
        stmt = (
            select(Transaction.id)
            .where(
                Transaction.user_id == user_id,
                func.round(Transaction.amount, 0) != Transaction.amount,
            )
            .limit(1)
        )
        return self.db.scalar(stmt) is not None
