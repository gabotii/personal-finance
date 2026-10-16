from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession

router = APIRouter(tags=["health"])
logger = logging.getLogger("app.health")


@router.get(
    "/health",
    summary="Health check",
    responses={
        200: {"content": {"application/json": {"example": {"status": "ok"}}}},
        503: {"content": {"application/json": {"example": {"status": "error"}}}},
    },
)
def health(db: DbSession) -> JSONResponse:
    """Verifica que la aplicación responde y que la base de datos acepta consultas."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("health_database_error", extra={"error": type(exc).__name__})
        return JSONResponse(
            status_code=503,
            content={"status": "error", "checks": {"app": "ok", "database": "error"}},
        )
    return JSONResponse(content={"status": "ok", "checks": {"app": "ok", "database": "ok"}})
