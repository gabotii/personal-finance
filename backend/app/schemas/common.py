from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

PAGE_SIZES: tuple[int, ...] = (10, 25, 50, 100)


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class DataResponse[T](BaseModel):
    data: T
    message: str = "Success"


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def build(cls, items: list[T], *, total: int, page: int, page_size: int) -> Page[T]:
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )


class ErrorDetail(BaseModel):
    code: str = Field(examples=["VALIDATION_ERROR"])
    message: str = Field(examples=["Los datos enviados no son válidos."])
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


def error_responses(*status_codes: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI documentation for the error envelope on the given status codes."""
    descriptions = {
        400: "Solicitud inválida",
        401: "No autenticado",
        403: "Prohibido",
        404: "No encontrado",
        409: "Conflicto",
        422: "Error de validación",
        429: "Demasiadas solicitudes",
    }
    return {
        code: {"model": ErrorResponse, "description": descriptions.get(code, "Error")}
        for code in status_codes
    }
