from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.cookies import clear_session_cookie, set_session_cookie
from app.api.deps import (
    CurrentUser,
    DbSession,
    SettingsDep,
    login_rate_limit,
    register_rate_limit,
)
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.common import DataResponse, error_responses
from app.schemas.user import UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[UserRead],
    dependencies=[Depends(register_rate_limit)],
    responses=error_responses(409, 422, 429),
    summary="Crear cuenta",
)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: DbSession,
    settings: SettingsDep,
) -> DataResponse[UserRead]:
    """Crea el usuario, sus categorías predeterminadas e inicia sesión (cookie HttpOnly)."""
    user, token = AuthService(db, settings).register(
        payload, user_agent=request.headers.get("user-agent")
    )
    set_session_cookie(response, token, settings)
    return DataResponse(data=UserRead.model_validate(user), message="Cuenta creada")


@router.post(
    "/login",
    response_model=DataResponse[UserRead],
    dependencies=[Depends(login_rate_limit)],
    responses=error_responses(401, 422, 429),
    summary="Iniciar sesión",
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
    settings: SettingsDep,
) -> DataResponse[UserRead]:
    user, token = AuthService(db, settings).login(
        payload, user_agent=request.headers.get("user-agent")
    )
    set_session_cookie(response, token, settings)
    return DataResponse(data=UserRead.model_validate(user), message="Sesión iniciada")


@router.post(
    "/logout",
    response_model=DataResponse[None],
    summary="Cerrar sesión",
)
def logout(
    request: Request, response: Response, db: DbSession, settings: SettingsDep
) -> DataResponse[None]:
    """Revoca la sesión en el servidor y elimina la cookie. Es idempotente."""
    AuthService(db, settings).logout(request.cookies.get(settings.session_cookie_name))
    clear_session_cookie(response, settings)
    return DataResponse(data=None, message="Sesión cerrada")


@router.get(
    "/me",
    response_model=DataResponse[UserRead],
    responses=error_responses(401),
    summary="Usuario actual",
)
def me(user: CurrentUser) -> DataResponse[UserRead]:
    return DataResponse(data=UserRead.model_validate(user))
