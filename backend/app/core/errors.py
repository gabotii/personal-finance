"""Domain errors and the handlers that render them as `{"error": {...}}` responses."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


class AppError(Exception):
    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "BAD_REQUEST"
    message: str = "La solicitud no es válida."

    def __init__(
        self,
        message: str | None = None,
        *,
        details: dict[str, Any] | None = None,
        code: str | None = None,
    ) -> None:
        self.message = message or self.message
        self.details = details or {}
        if code is not None:
            self.code = code
        super().__init__(self.message)


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "VALIDATION_ERROR"
    message = "Los datos enviados no son válidos."


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"
    message = "Debes iniciar sesión."


class InvalidCredentialsError(AuthenticationError):
    code = "INVALID_CREDENTIALS"
    message = "Email o contraseña incorrectos."


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN"
    message = "No tienes permiso para realizar esta acción."


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    message = "El recurso no existe."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"
    message = "La operación entra en conflicto con el estado actual."


class RateLimitError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "RATE_LIMITED"
    message = "Demasiados intentos. Espera un momento e inténtalo nuevamente."

    def __init__(self, retry_after: int) -> None:
        super().__init__(details={"retry_after": retry_after})
        self.retry_after = retry_after


def error_body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


HTTP_STATUS_CODES: dict[int, tuple[str, str]] = {
    400: ("BAD_REQUEST", "La solicitud no es válida."),
    401: ("UNAUTHORIZED", "Debes iniciar sesión."),
    403: ("FORBIDDEN", "No tienes permiso para realizar esta acción."),
    404: ("NOT_FOUND", "El recurso no existe."),
    405: ("METHOD_NOT_ALLOWED", "Método no permitido."),
    409: ("CONFLICT", "La operación entra en conflicto con el estado actual."),
    413: ("PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande."),
    415: ("UNSUPPORTED_MEDIA_TYPE", "Tipo de contenido no soportado."),
    422: ("VALIDATION_ERROR", "Los datos enviados no son válidos."),
    429: ("RATE_LIMITED", "Demasiadas solicitudes."),
}


def _format_validation_errors(exc: RequestValidationError) -> dict[str, Any]:
    fields: dict[str, str] = {}
    for error in exc.errors():
        location = [str(part) for part in error.get("loc", ()) if part not in ("body",)]
        # Drop the leading "query"/"path" for readability, keep it for body-less errors.
        if len(location) > 1 and location[0] in ("query", "path", "header", "cookie"):
            location = location[1:]
        key = ".".join(location) or "__root__"
        message = str(error.get("msg", "Valor inválido."))
        message = message.removeprefix("Value error, ")
        fields.setdefault(key, message)
    return {"fields": fields}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        headers = None
        if isinstance(exc, RateLimitError):
            headers = {"Retry-After": str(exc.retry_after)}
        return JSONResponse(
            status_code=exc.status_code,
            content=jsonable_encoder(error_body(exc.code, exc.message, exc.details)),
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=error_body(
                "VALIDATION_ERROR",
                "Los datos enviados no son válidos.",
                _format_validation_errors(exc),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code, default_message = HTTP_STATUS_CODES.get(
            exc.status_code, ("HTTP_ERROR", "Error en la solicitud.")
        )
        message = exc.detail if isinstance(exc.detail, str) and exc.status_code < 500 else None
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(code, message or default_message),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_error",
            extra={"path": request.url.path, "method": request.method},
            exc_info=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_body(
                "INTERNAL_ERROR",
                "Ocurrió un error inesperado. Inténtalo nuevamente más tarde.",
            ),
        )
