from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import AuthSession, CurrentUser, DbSession
from app.schemas.common import DataResponse, error_responses
from app.schemas.user import PasswordChange, UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=DataResponse[UserRead], responses=error_responses(401))
def get_profile(user: CurrentUser) -> DataResponse[UserRead]:
    return DataResponse(data=UserRead.model_validate(user))


@router.patch(
    "/me",
    response_model=DataResponse[UserRead],
    responses=error_responses(401, 409, 422),
    summary="Actualizar perfil y preferencias",
)
def update_profile(payload: UserUpdate, user: CurrentUser, db: DbSession) -> DataResponse[UserRead]:
    updated = UserService(db).update_profile(user, payload)
    return DataResponse(data=UserRead.model_validate(updated), message="Preferencias guardadas")


@router.post(
    "/me/password",
    response_model=DataResponse[None],
    responses=error_responses(401, 422),
    summary="Cambiar contraseña",
)
def change_password(
    payload: PasswordChange, auth: AuthSession, db: DbSession
) -> DataResponse[None]:
    """Cambia la contraseña y cierra todas las demás sesiones abiertas."""
    UserService(db).change_password(auth.user, auth.session, payload)
    return DataResponse(data=None, message="Contraseña actualizada")
