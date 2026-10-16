from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.routes import health
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import (
    OriginCheckMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)

OPENAPI_TAGS = [
    {"name": "auth", "description": "Registro, login, logout y sesión actual (cookie HttpOnly)."},
    {"name": "users", "description": "Perfil y preferencias del usuario."},
    {"name": "transactions", "description": "Ingresos y gastos: CRUD, filtros y paginación."},
    {"name": "categories", "description": "Categorías de ingresos y gastos."},
    {"name": "dashboard", "description": "Métricas y series calculadas en el servidor."},
    {"name": "exports", "description": "Exportación de movimientos a CSV y Excel."},
    {"name": "health", "description": "Estado de la aplicación y la base de datos."},
]

DESCRIPTION = """
API de finanzas personales.

* Respuestas exitosas: `{"data": ..., "message": "..."}`. `DELETE` responde `204` sin cuerpo.
* Errores: `{"error": {"code": "...", "message": "...", "details": {...}}}`.
  Los errores de validación incluyen `details.fields` con un mensaje por campo.
* Montos: decimales serializados como string (`"25000.00"`), siempre positivos;
  el signo lo determina `type` (`INCOME` / `EXPENSE`).
* Autenticación: cookie de sesión HttpOnly emitida por `/auth/login` y `/auth/register`.
"""


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.json_logs)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        logging.getLogger("app").info(
            "startup", extra={"env": settings.app_env, "version": settings.app_version}
        )
        yield
        logging.getLogger("app").info("shutdown")

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=DESCRIPTION,
        openapi_tags=OPENAPI_TAGS,
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )

    register_exception_handlers(app)

    # Starlette wraps middlewares in reverse order: the last one added runs first.
    app.add_middleware(OriginCheckMiddleware, allowed_origins=settings.cors_origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["Content-Disposition", "X-Request-ID"],
        max_age=600,
    )
    app.add_middleware(SecurityHeadersMiddleware, hsts=settings.is_production)
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health.router)
    app.include_router(api_router)
    return app


app = create_app()
