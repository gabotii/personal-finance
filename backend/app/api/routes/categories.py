from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.enums import TransactionType
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.common import DataResponse, error_responses
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get(
    "",
    response_model=DataResponse[list[CategoryRead]],
    responses=error_responses(401, 422),
    summary="Listar categorías",
)
def list_categories(
    user: CurrentUser,
    db: DbSession,
    type: Annotated[TransactionType | None, Query()] = None,  # noqa: A002 - public API name
    include_inactive: Annotated[bool, Query()] = True,
) -> DataResponse[list[CategoryRead]]:
    """Incluye `transaction_count` para saber si una categoría está en uso."""
    return DataResponse(
        data=CategoryService(db).list(user, type_=type, include_inactive=include_inactive)
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[CategoryRead],
    responses=error_responses(401, 409, 422),
    summary="Crear categoría",
)
def create_category(
    payload: CategoryCreate, user: CurrentUser, db: DbSession
) -> DataResponse[CategoryRead]:
    return DataResponse(data=CategoryService(db).create(user, payload), message="Categoría creada")


@router.patch(
    "/{category_id}",
    response_model=DataResponse[CategoryRead],
    responses=error_responses(401, 404, 409, 422),
    summary="Editar, activar o desactivar categoría",
)
def update_category(
    category_id: uuid.UUID, payload: CategoryUpdate, user: CurrentUser, db: DbSession
) -> DataResponse[CategoryRead]:
    return DataResponse(
        data=CategoryService(db).update(user, category_id, payload),
        message="Categoría actualizada",
    )


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses=error_responses(401, 404, 409, 422),
    summary="Eliminar categoría",
)
def delete_category(
    category_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    reassign_to: Annotated[uuid.UUID | None, Query()] = None,
) -> Response:
    """Si la categoría tiene movimientos responde `409 CATEGORY_IN_USE`, salvo que se
    indique `reassign_to` (otra categoría del mismo tipo) para moverlos antes de eliminar."""
    CategoryService(db).delete(user, category_id, reassign_to=reassign_to)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
