from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.core.enums import Currency, ThemePreference
from app.schemas.common import ApiModel
from app.schemas.validators import (
    validate_not_blank,
    validate_password_strength,
    validate_timezone,
)


class UserRead(ApiModel):
    id: uuid.UUID
    name: str
    email: str
    currency: Currency
    timezone: str
    theme: ThemePreference
    created_at: datetime


class UserUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    currency: Currency | None = None
    timezone: str | None = Field(default=None, max_length=64)
    theme: ThemePreference | None = None

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        return None if value is None else validate_not_blank(value)

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, value: str | None) -> str | None:
        return None if value is None else validate_timezone(value)


class PasswordChange(ApiModel):
    model_config = ApiModel.model_config | {"str_strip_whitespace": False}

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _strength(cls, value: str) -> str:
        return validate_password_strength(value)
