from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.common import DataResponse, Page, error_responses
from app.schemas.transaction import (
    TransactionCreate,
    TransactionListParams,
    TransactionRead,
    TransactionUpdate,
)
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get(
    "",
    response_model=DataResponse[Page[TransactionRead]],
    responses=error_responses(401, 422),
    summary="Listar movimientos",
)
def list_transactions(
    params: Annotated[TransactionListParams, Query()], user: CurrentUser, db: DbSession
) -> DataResponse[Page[TransactionRead]]:
    """Listado paginado server-side. Todos los filtros son opcionales y se combinan (AND).

    `q` busca en descripción, notas y nombre de categoría.
    """
    return DataResponse(data=TransactionService(db).list(user, params))


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[TransactionRead],
    responses=error_responses(401, 422),
    summary="Crear movimiento",
)
def create_transaction(
    payload: TransactionCreate, user: CurrentUser, db: DbSession
) -> DataResponse[TransactionRead]:
    return DataResponse(
        data=TransactionService(db).create(user, payload), message="Movimiento creado"
    )


@router.get(
    "/{transaction_id}",
    response_model=DataResponse[TransactionRead],
    responses=error_responses(401, 404),
    summary="Obtener movimiento",
)
def get_transaction(
    transaction_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> DataResponse[TransactionRead]:
    return DataResponse(data=TransactionService(db).get(user, transaction_id))


@router.patch(
    "/{transaction_id}",
    response_model=DataResponse[TransactionRead],
    responses=error_responses(401, 404, 422),
    summary="Editar movimiento",
)
def update_transaction(
    transaction_id: uuid.UUID, payload: TransactionUpdate, user: CurrentUser, db: DbSession
) -> DataResponse[TransactionRead]:
    return DataResponse(
        data=TransactionService(db).update(user, transaction_id, payload),
        message="Movimiento actualizado",
    )


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    responses=error_responses(401, 404),
    summary="Eliminar movimiento",
)
def delete_transaction(transaction_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    TransactionService(db).delete(user, transaction_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
