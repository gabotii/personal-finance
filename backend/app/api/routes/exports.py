from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Response
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, DbSession, SettingsDep
from app.schemas.common import error_responses
from app.schemas.transaction import TransactionFilters
from app.services.export_service import ExportService, export_filename
from app.services.transaction_service import validate_filters

router = APIRouter(prefix="/export", tags=["exports"])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _attachment(filename: str) -> dict[str, str]:
    return {"Content-Disposition": f'attachment; filename="{filename}"'}


@router.get(
    "/csv",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"text/csv": {}}, "description": "Archivo CSV (UTF-8 con BOM)"},
        **error_responses(401, 422),
    },
    summary="Exportar movimientos a CSV",
)
def export_csv(
    filters: Annotated[TransactionFilters, Query()],
    user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> StreamingResponse:
    """Acepta los mismos filtros que `GET /transactions`. Se transmite en streaming."""
    validate_filters(filters)  # fail with 422 before the streaming response starts
    return StreamingResponse(
        ExportService(db, settings).stream_csv(user, filters),
        media_type="text/csv; charset=utf-8",
        headers=_attachment(export_filename("csv", user)),
    )


@router.get(
    "/excel",
    response_class=Response,
    responses={
        200: {"content": {XLSX_MEDIA_TYPE: {}}, "description": "Libro Excel"},
        **error_responses(401, 422),
    },
    summary="Exportar movimientos a Excel",
)
def export_excel(
    filters: Annotated[TransactionFilters, Query()],
    user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> Response:
    """Libro con hojas Movimientos, Resumen y Categorías, aplicando los mismos filtros."""
    content = ExportService(db, settings).build_excel(user, filters)
    return Response(
        content=content,
        media_type=XLSX_MEDIA_TYPE,
        headers=_attachment(export_filename("xlsx", user)),
    )
