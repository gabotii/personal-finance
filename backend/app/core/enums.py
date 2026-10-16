from __future__ import annotations

from enum import StrEnum


class TransactionType(StrEnum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class Currency(StrEnum):
    CLP = "CLP"
    USD = "USD"
    EUR = "EUR"

    @property
    def decimal_places(self) -> int:
        return CURRENCY_DECIMALS[self]


CURRENCY_DECIMALS: dict[Currency, int] = {
    Currency.CLP: 0,
    Currency.USD: 2,
    Currency.EUR: 2,
}


class ThemePreference(StrEnum):
    LIGHT = "LIGHT"
    DARK = "DARK"
    SYSTEM = "SYSTEM"


class TransactionSort(StrEnum):
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"
    AMOUNT_DESC = "amount_desc"
    AMOUNT_ASC = "amount_asc"


# Closed set of Lucide icon names the frontend knows how to render.
CATEGORY_ICONS: frozenset[str] = frozenset(
    {
        "utensils",
        "home",
        "car",
        "heart-pulse",
        "graduation-cap",
        "clapperboard",
        "shopping-bag",
        "plug",
        "repeat",
        "plane",
        "circle-ellipsis",
        "briefcase",
        "laptop",
        "store",
        "trending-up",
        "piggy-bank",
        "gift",
        "coffee",
        "shirt",
        "dumbbell",
        "baby",
        "paw-print",
        "fuel",
        "bus",
        "smartphone",
        "wifi",
        "receipt",
        "landmark",
        "wallet",
        "banknote",
        "music",
        "book-open",
        "wrench",
        "sparkles",
    }
)
