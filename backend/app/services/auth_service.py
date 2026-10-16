from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ConflictError, InvalidCredentialsError
from app.core.security import (
    burn_password_check,
    generate_session_token,
    hash_password,
    hash_session_token,
    password_needs_rehash,
    verify_password,
)
from app.models.user import User
from app.models.user_session import UserSession
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.category_service import CategoryService

logger = logging.getLogger("app.auth")

LAST_USED_RESOLUTION = timedelta(minutes=5)


@dataclass(frozen=True, slots=True)
class AuthenticatedSession:
    user: User
    session: UserSession
    renewed: bool


class AuthService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.users = UserRepository(db)
        self.sessions = SessionRepository(db)

    def register(self, data: RegisterRequest, *, user_agent: str | None) -> tuple[User, str]:
        if self.users.email_exists(data.email):
            raise self._email_taken()
        user = User(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
            currency=data.currency or self.settings.default_currency,
            timezone=data.timezone or self.settings.default_timezone,
        )
        try:
            self.users.add(user)
        except IntegrityError as exc:  # concurrent registration with the same email
            self.db.rollback()
            raise self._email_taken() from exc
        CategoryService(self.db).create_defaults(user.id)
        token = self._create_session(user, user_agent)
        self.db.commit()
        logger.info("user_registered", extra={"user_id": str(user.id)})
        return user, token

    def login(self, data: LoginRequest, *, user_agent: str | None) -> tuple[User, str]:
        user = self.users.get_by_email(data.email)
        if user is None:
            burn_password_check(data.password)
            raise InvalidCredentialsError()
        if not verify_password(data.password, user.password_hash):
            logger.info("login_failed", extra={"user_id": str(user.id)})
            raise InvalidCredentialsError()
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(data.password)
        self.sessions.delete_expired_for_user(user.id, datetime.now(UTC))
        token = self._create_session(user, user_agent)
        self.db.commit()
        logger.info("login_succeeded", extra={"user_id": str(user.id)})
        return user, token

    def logout(self, token: str | None) -> None:
        if not token:
            return
        self.sessions.delete_by_token_hash(hash_session_token(token, self.settings.secret_key))
        self.db.commit()

    def authenticate(self, token: str) -> AuthenticatedSession | None:
        now = datetime.now(UTC)
        session = self.sessions.get_active_by_token_hash(
            hash_session_token(token, self.settings.secret_key), now
        )
        if session is None:
            return None

        renewed = False
        ttl = timedelta(seconds=self.settings.session_ttl_seconds)
        if session.expires_at - now < ttl / 2:
            session.expires_at = now + ttl
            renewed = True
        if renewed or now - session.last_used_at > LAST_USED_RESOLUTION:
            session.last_used_at = now
            self.db.commit()
        return AuthenticatedSession(user=session.user, session=session, renewed=renewed)

    def _create_session(self, user: User, user_agent: str | None) -> str:
        token = generate_session_token()
        now = datetime.now(UTC)
        self.sessions.add(
            UserSession(
                user_id=user.id,
                token_hash=hash_session_token(token, self.settings.secret_key),
                expires_at=now + timedelta(seconds=self.settings.session_ttl_seconds),
                last_used_at=now,
                user_agent=(user_agent or "")[:255] or None,
            )
        )
        return token

    @staticmethod
    def _email_taken() -> ConflictError:
        return ConflictError(
            "Ya existe una cuenta con ese email.",
            code="EMAIL_TAKEN",
            details={"fields": {"email": "Ya existe una cuenta con ese email."}},
        )
