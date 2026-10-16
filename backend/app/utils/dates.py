from __future__ import annotations

import calendar
import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

MONTH_PATTERN = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


def today_in(timezone: str) -> date:
    return datetime.now(ZoneInfo(timezone)).date()


def parse_month(value: str) -> tuple[int, int]:
    """Parse `YYYY-MM`. Raises ValueError on malformed input."""
    match = MONTH_PATTERN.match(value)
    if not match:
        raise ValueError("El mes debe tener formato AAAA-MM.")
    year, month = int(match.group(1)), int(match.group(2))
    if not 1970 <= year <= 2100:
        raise ValueError("El año está fuera del rango permitido.")
    return year, month


def format_month(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1
