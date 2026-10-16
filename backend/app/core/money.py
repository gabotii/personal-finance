"""Money helpers. Every monetary value in the backend is a `Decimal`, never a float."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from app.core.enums import Currency

STORAGE_PLACES = 2
STORAGE_QUANTUM = Decimal("0.01")
PERCENT_QUANTUM = Decimal("0.01")
ZERO = Decimal("0.00")
HUNDRED = Decimal("100")

# NUMERIC(14, 2): up to 12 integer digits.
MAX_AMOUNT = Decimal("999999999999.99")


def to_money(value: Decimal | int | str | float | None) -> Decimal:
    """Normalize a value coming from the database (or a literal) to a 2-decimal Decimal.

    Aggregates on SQLite come back as floats; converting through `str` avoids binary
    float artifacts before quantizing.
    """
    if value is None:
        return ZERO
    if isinstance(value, Decimal):
        decimal_value = value
    elif isinstance(value, float):
        decimal_value = Decimal(repr(value))
    else:
        decimal_value = Decimal(value)
    return decimal_value.quantize(STORAGE_QUANTUM, rounding=ROUND_HALF_UP)


def decimal_places(value: Decimal) -> int:
    exponent = value.normalize().as_tuple().exponent
    if not isinstance(exponent, int):
        return 0
    return max(0, -exponent)


def fits_currency(value: Decimal, currency: Currency) -> bool:
    return decimal_places(value) <= currency.decimal_places


def percentage(part: Decimal, whole: Decimal) -> Decimal | None:
    """`part / whole * 100`, or None when `whole` is zero (undefined ratio)."""
    if whole == 0:
        return None
    return (part / whole * HUNDRED).quantize(PERCENT_QUANTUM, rounding=ROUND_HALF_UP)


def percent_change(current: Decimal, previous: Decimal) -> Decimal | None:
    """Relative change from `previous` to `current`; None when `previous` is zero."""
    if previous == 0:
        return None
    return ((current - previous) / abs(previous) * HUNDRED).quantize(
        PERCENT_QUANTUM, rounding=ROUND_HALF_UP
    )
