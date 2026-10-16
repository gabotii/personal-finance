"""Spreadsheet-safety helpers (CSV / formula injection, OWASP recommendation)."""

from __future__ import annotations

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def is_formula_like(value: str) -> bool:
    return value.startswith(FORMULA_PREFIXES)


def sanitize_csv_text(value: str | None) -> str:
    """Neutralize user text so spreadsheet apps never evaluate it as a formula."""
    if not value:
        return ""
    return f"'{value}" if is_formula_like(value) else value
