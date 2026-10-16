from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.errors import ConflictError, ValidationError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.user_session import UserSession
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordChange, UserUpdate

logger = logging.getLogger("app.users")


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.sessions = SessionRepository(db)

    def update_profile(self, user: User, data: UserUpdate) -> User:
        changes = data.model_dump(exclude_unset=True, exclude_none=True)
        new_currency = changes.get("currency")
        if (
            new_currency is not None
            and new_currency != user.currency
            and new_currency.decimal_places < user.currency.decimal_places
            and self.users.has_fractional_amounts(user.id)
        ):
            raise ConflictError(
                f"Tienes movimientos con decimales; {new_currency.value} no admite decimales.",
                code="CURRENCY_CHANGE_BLOCKED",
                details={"fields": {"currency": "Hay montos con decimales registrados."}},
            )
        for field, value in changes.items():
            setattr(user, field, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def change_password(
        self, user: User, current_session: UserSession, data: PasswordChange
    ) -> None:
        if not verify_password(data.current_password, user.password_hash):
            raise ValidationError(
                "La contraseña actual es incorrecta.",
                details={"fields": {"current_password": "La contraseña actual es incorrecta."}},
            )
        if data.current_password == data.new_password:
            raise ValidationError(
                details={"fields": {"new_password": "Debe ser distinta de la actual."}}
            )
        user.password_hash = hash_password(data.new_password)
        self.sessions.delete_all_for_user_except(user.id, current_session.id)
        self.db.commit()
        logger.info("password_changed", extra={"user_id": str(user.id)})
