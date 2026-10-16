from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from app.core.enums import TransactionSort, TransactionType
from app.core.money import MAX_AMOUNT, decimal_places
from app.schemas.category import CategorySummary
from app.schemas.common import PAGE_SIZES, ApiModel
from app.schemas.validators import normalize_optional_text, validate_not_blank

MIN_DATE = date(1970, 1, 1)
MAX_DATE = date(2100, 12, 31)


def _validate_amount(value: Decimal) -> Decimal:
    if not value.is_finite():
        raise ValueError("Monto inválido.")
    if value <= 0:
        raise ValueError("El monto debe ser mayor a 0.")
    if value > MAX_AMOUNT:
        raise ValueError("El monto es demasiado grande.")
    if decimal_places(value) > 2:
        raise ValueError("El monto admite como máximo 2 decimales.")
    return value


def _validate_date(value: date) -> date:
    if not MIN_DATE <= value <= MAX_DATE:
        raise ValueError("La fecha está fuera del rango permitido.")
    return value


Amount = Annotated[Decimal, AfterValidator(_validate_amount)]
TransactionDate = Annotated[date, AfterValidator(_validate_date)]


class TransactionCreate(ApiModel):
    type: TransactionType
    amount: Amount = Field(examples=["25000"])
    description: str = Field(min_length=1, max_length=200, examples=["Supermercado"])
    notes: str | None = Field(default=None, max_length=2000)
    category_id: uuid.UUID
    transaction_date: TransactionDate

    @field_validator("description")
    @classmethod
    def _description(cls, value: str) -> str:
        return validate_not_blank(value)

    @field_validator("notes")
    @classmethod
    def _notes(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class TransactionUpdate(ApiModel):
    """Partial update. Only fields present in the request body are applied."""

    type: TransactionType | None = None
    amount: Amount | None = None
    description: str | None = Field(default=None, min_length=1, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)
    category_id: uuid.UUID | None = None
    transaction_date: TransactionDate | None = None

    @field_validator("description")
    @classmethod
    def _description(cls, value: str | None) -> str | None:
        return None if value is None else validate_not_blank(value)

    @field_validator("notes")
    @classmethod
    def _notes(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class TransactionRead(ApiModel):
    id: uuid.UUID
    type: TransactionType
    amount: Decimal
    description: str
    notes: str | None
    transaction_date: date
    category: CategorySummary
    created_at: datetime
    updated_at: datetime


def _validate_page_size(value: int) -> int:
    if value not in PAGE_SIZES:
        raise ValueError(f"page_size debe ser uno de {', '.join(map(str, PAGE_SIZES))}.")
    return value


class TransactionFilters(BaseModel):
    """Filters shared by the listing and the exports. All of them combine with AND."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    date_from: date | None = None
    date_to: date | None = None
    type: TransactionType | None = None
    category_id: uuid.UUID | None = None
    q: str | None = Field(default=None, max_length=100)
    min_amount: Decimal | None = Field(default=None, ge=0, le=MAX_AMOUNT)
    max_amount: Decimal | None = Field(default=None, ge=0, le=MAX_AMOUNT)

    @field_validator("q")
    @classmethod
    def _q(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class TransactionListParams(TransactionFilters):
    page: int = Field(default=1, ge=1, le=100_000)
    page_size: Annotated[int, AfterValidator(_validate_page_size)] = 25
    sort: TransactionSort = TransactionSort.DATE_DESC

    def filters(self) -> TransactionFilters:
        return TransactionFilters.model_validate(
            self.model_dump(include=set(TransactionFilters.model_fields))
        )
