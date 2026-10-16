from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.core.enums import CATEGORY_ICONS, TransactionType
from app.schemas.common import ApiModel
from app.schemas.validators import validate_hex_color, validate_not_blank


def _validate_icon(value: str) -> str:
    if value not in CATEGORY_ICONS:
        raise ValueError("Ícono no soportado.")
    return value


class CategorySummary(ApiModel):
    id: uuid.UUID
    name: str
    type: TransactionType
    color: str
    icon: str
    is_active: bool


class CategoryRead(CategorySummary):
    transaction_count: int = 0
    created_at: datetime
    updated_at: datetime


class CategoryCreate(ApiModel):
    name: str = Field(min_length=1, max_length=50, examples=["Mascotas"])
    type: TransactionType
    color: str = Field(examples=["#0ea5e9"])
    icon: str = Field(examples=["paw-print"])

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return validate_not_blank(value)

    @field_validator("color")
    @classmethod
    def _color(cls, value: str) -> str:
        return validate_hex_color(value)

    @field_validator("icon")
    @classmethod
    def _icon(cls, value: str) -> str:
        return _validate_icon(value)


class CategoryUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    type: TransactionType | None = None
    color: str | None = None
    icon: str | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        return None if value is None else validate_not_blank(value)

    @field_validator("color")
    @classmethod
    def _color(cls, value: str | None) -> str | None:
        return None if value is None else validate_hex_color(value)

    @field_validator("icon")
    @classmethod
    def _icon(cls, value: str | None) -> str | None:
        return None if value is None else _validate_icon(value)
