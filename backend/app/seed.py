"""Load demo data: a demo user, default categories and ~12 months of transactions.

Usage:
    python -m app.seed            # creates the demo user if it does not exist
    python -m app.seed --reset    # deletes and recreates the demo user and its data

The data is deterministic (fixed random seed) so screenshots and demos are reproducible.
"""

from __future__ import annotations

import argparse
import logging
import random
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.enums import Currency, TransactionType
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.services.category_service import CategoryService
from app.utils.dates import month_bounds, shift_month, today_in

logger = logging.getLogger("app.seed")

DEMO_EMAIL = "demo@finanzas.app"
DEMO_PASSWORD = "Demo1234"  # noqa: S105 - documented demo credential, never used in production
DEMO_NAME = "Usuario Demo"
DEMO_TIMEZONE = "America/Santiago"


@dataclass(frozen=True)
class Recurring:
    category: str
    description: str
    day: int
    low: int
    high: int


@dataclass(frozen=True)
class Variable:
    category: str
    descriptions: tuple[str, ...]
    per_month: tuple[int, int]
    low: int
    high: int


FIXED_EXPENSES = (
    Recurring("Vivienda", "Arriendo departamento", 5, 550_000, 550_000),
    Recurring("Servicios", "Cuenta de luz", 12, 28_000, 46_000),
    Recurring("Servicios", "Cuenta de agua", 14, 12_000, 19_000),
    Recurring("Servicios", "Internet hogar", 10, 24_990, 24_990),
    Recurring("Suscripciones", "Netflix", 8, 9_990, 9_990),
    Recurring("Suscripciones", "Spotify", 15, 6_490, 6_490),
    Recurring("Salud", "Plan de salud", 3, 78_000, 78_000),
    Recurring("Educación", "Curso de inglés online", 20, 45_000, 45_000),
)

VARIABLE_EXPENSES = (
    Variable(
        "Alimentación",
        ("Supermercado", "Feria", "Panadería", "Almuerzo trabajo", "Delivery"),
        (10, 16),
        4_500,
        85_000,
    ),
    Variable(
        "Transporte", ("Carga Bip!", "Uber", "Bencina", "Estacionamiento"), (4, 8), 2_500, 45_000
    ),
    Variable(
        "Entretenimiento",
        ("Cine", "Concierto", "Salida con amigos", "Videojuego"),
        (1, 4),
        6_000,
        55_000,
    ),
    Variable(
        "Compras", ("Ropa", "Artículos de hogar", "Electrónica", "Regalo"), (1, 3), 9_000, 120_000
    ),
    Variable("Salud", ("Farmacia", "Consulta médica", "Dentista"), (0, 2), 7_000, 60_000),
    Variable("Otros", ("Peluquería", "Donación", "Imprevisto"), (0, 2), 5_000, 40_000),
)


def _amount(rng: random.Random, low: int, high: int) -> Decimal:
    value = low if low == high else rng.randint(low, high)
    return Decimal(round(value, -1) if value >= 100 else value)


def _day(year: int, month: int, day: int) -> date:
    _, last = month_bounds(year, month)
    return date(year, month, min(day, last.day))


def _generate(
    rng: random.Random,
    categories: dict[tuple[TransactionType, str], Category],
    today: date,
    months: int,
) -> Iterator[Transaction]:
    def make(
        type_: TransactionType,
        category: str,
        description: str,
        amount: Decimal,
        when: date,
        notes: str | None = None,
    ) -> Transaction:
        return Transaction(
            type=type_,
            category=categories[(type_, category)],
            amount=amount,
            description=description,
            notes=notes,
            transaction_date=when,
        )

    for offset in range(months - 1, -1, -1):
        year, month = shift_month(today.year, today.month, -offset)
        first, last = month_bounds(year, month)
        last = min(last, today)

        salary_date = _day(year, month, 1)
        if salary_date <= today:
            yield make(
                TransactionType.INCOME,
                "Salario",
                "Sueldo mensual",
                Decimal(1_850_000 + 50_000 * (offset < 6)),
                salary_date,
            )
        if rng.random() < 0.55:
            when = first + timedelta(days=rng.randint(0, (last - first).days))
            yield make(
                TransactionType.INCOME,
                "Freelance",
                "Proyecto freelance diseño web",
                _amount(rng, 150_000, 520_000),
                when,
                "Pago por transferencia",
            )
        if month in (3, 6, 9, 12):
            when = _day(year, month, 28)
            if when <= today:
                yield make(
                    TransactionType.INCOME,
                    "Inversiones",
                    "Dividendos fondo mutuo",
                    _amount(rng, 35_000, 90_000),
                    when,
                )

        for item in FIXED_EXPENSES:
            when = _day(year, month, item.day)
            if when <= today:
                yield make(
                    TransactionType.EXPENSE,
                    item.category,
                    item.description,
                    _amount(rng, item.low, item.high),
                    when,
                )

        for variable in VARIABLE_EXPENSES:
            for _ in range(rng.randint(*variable.per_month)):
                when = first + timedelta(days=rng.randint(0, (last - first).days))
                yield make(
                    TransactionType.EXPENSE,
                    variable.category,
                    rng.choice(variable.descriptions),
                    _amount(rng, variable.low, variable.high),
                    when,
                )

        if month in (1, 7):
            when = _day(year, month, 18)
            if when <= today:
                yield make(
                    TransactionType.EXPENSE,
                    "Viajes",
                    "Vacaciones",
                    _amount(rng, 380_000, 720_000),
                    when,
                    "Pasajes y alojamiento",
                )


def seed(db: Session, *, reset: bool = False, months: int = 12) -> User | None:
    existing = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if existing is not None:
        if not reset:
            logger.info("seed_skipped", extra={"reason": "demo user already exists"})
            return None
        db.delete(existing)
        db.commit()

    user = User(
        name=DEMO_NAME,
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        currency=Currency.CLP,
        timezone=DEMO_TIMEZONE,
    )
    db.add(user)
    db.flush()
    CategoryService(db).create_defaults(user.id)
    categories = {
        (category.type, category.name): category
        for category in db.scalars(select(Category).where(Category.user_id == user.id))
    }

    rng = random.Random(20261005)
    transactions = list(_generate(rng, categories, today_in(DEMO_TIMEZONE), months))
    for transaction in transactions:
        transaction.user_id = user.id
    db.add_all(transactions)
    db.commit()
    logger.info("seed_completed", extra={"transactions": len(transactions)})
    return user


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga datos de demostración.")
    parser.add_argument("--reset", action="store_true", help="Recrea el usuario demo.")
    parser.add_argument("--months", type=int, default=12, choices=range(1, 25), metavar="1-24")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(settings.log_level, settings.json_logs)
    if settings.is_production:
        parser.error("El seed de demostración no se ejecuta con APP_ENV=production.")

    with SessionLocal() as db:
        user = seed(db, reset=args.reset, months=args.months)
    if user is not None:
        print(f"Usuario demo listo: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    else:
        print(f"El usuario demo ya existe ({DEMO_EMAIL}). Usa --reset para recrearlo.")


if __name__ == "__main__":
    main()
