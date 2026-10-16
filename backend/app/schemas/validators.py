"""Reusable field validators shared by several schemas."""

from __future__ import annotations

import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


def validate_password_strength(value: str) -> str:
    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres.")
    if len(value) > PASSWORD_MAX_LENGTH:
        raise ValueError(f"La contraseña no puede superar {PASSWORD_MAX_LENGTH} caracteres.")
    if not any(char.isalpha() for char in value) or not any(char.isdigit() for char in value):
        raise ValueError("La contraseña debe incluir al menos una letra y un número.")
    return value


def validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError("Zona horaria inválida.") from exc
    return value


def validate_hex_color(value: str) -> str:
    if not HEX_COLOR_PATTERN.match(value):
        raise ValueError("El color debe tener formato hexadecimal #RRGGBB.")
    return value.lower()


def validate_not_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("Este campo es obligatorio.")
    return value.strip()


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None
