from __future__ import annotations

from pydantic import EmailStr, Field, field_validator

from app.core.enums import Currency
from app.schemas.common import ApiModel
from app.schemas.validators import (
    validate_not_blank,
    validate_password_strength,
    validate_timezone,
)


class RegisterRequest(ApiModel):
    model_config = ApiModel.model_config | {"str_strip_whitespace": False}

    name: str = Field(min_length=1, max_length=100, examples=["Camila Rojas"])
    email: EmailStr = Field(examples=["camila@example.com"])
    password: str = Field(examples=["Segura2024"])
    currency: Currency | None = None
    timezone: str | None = Field(default=None, max_length=64, examples=["America/Santiago"])

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        return validate_not_blank(value)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, value: str | None) -> str | None:
        return None if value is None else validate_timezone(value)


class LoginRequest(ApiModel):
    model_config = ApiModel.model_config | {"str_strip_whitespace": False}

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        return value.strip().lower()
