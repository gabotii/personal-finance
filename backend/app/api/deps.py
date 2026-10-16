from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.cookies import set_session_cookie
from app.core.config import Settings, get_settings
from app.core.errors import AuthenticationError
from app.core.rate_limit import auth_rate_limiter
from app.db import database
from app.models.user import User
from app.services.auth_service import AuthenticatedSession, AuthService


def get_db() -> Iterator[Session]:
    session = database.SessionLocal()
    try:
        yield session
    finally:
        session.close()


DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_auth_session(
    request: Request, response: Response, db: DbSession, settings: SettingsDep
) -> AuthenticatedSession:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise AuthenticationError()
    auth = AuthService(db, settings).authenticate(token)
    if auth is None:
        raise AuthenticationError(
            "Tu sesión expiró. Inicia sesión nuevamente.", code="SESSION_EXPIRED"
        )
    if auth.renewed:
        set_session_cookie(response, token, settings)
    return auth


AuthSession = Annotated[AuthenticatedSession, Depends(get_auth_session)]


def get_current_user(auth: AuthSession) -> User:
    return auth.user


CurrentUser = Annotated[User, Depends(get_current_user)]


def client_ip(request: Request) -> str:
    # Behind nginx, uvicorn's --proxy-headers already resolved X-Forwarded-For into client.host.
    return request.client.host if request.client else "unknown"


def login_rate_limit(request: Request, settings: SettingsDep) -> None:
    if settings.rate_limit_enabled:
        auth_rate_limiter.hit(
            f"login:{client_ip(request)}",
            settings.login_rate_limit,
            settings.login_rate_window_seconds,
        )


def register_rate_limit(request: Request, settings: SettingsDep) -> None:
    if settings.rate_limit_enabled:
        auth_rate_limiter.hit(
            f"register:{client_ip(request)}",
            settings.register_rate_limit,
            settings.register_rate_window_seconds,
        )
