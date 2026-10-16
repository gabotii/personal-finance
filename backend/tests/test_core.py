"""Unit tests for core helpers, health check, migrations and seed."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.core.enums import Currency
from app.core.errors import RateLimitError
from app.core.money import fits_currency, percent_change, percentage, to_money
from app.core.rate_limit import SlidingWindowRateLimiter
from app.db.base import Base
from app.models.transaction import Transaction
from app.models.user import User
from app.seed import DEMO_EMAIL, seed
from app.utils.dates import month_bounds, parse_month, shift_month
from app.utils.spreadsheet import sanitize_csv_text


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_money_helpers() -> None:
    assert to_money(0.1 + 0.2) == Decimal("0.30")
    assert to_money("10") == Decimal("10.00")
    assert to_money(None) == Decimal("0.00")
    assert fits_currency(Decimal("100"), Currency.CLP)
    assert fits_currency(Decimal("100.00"), Currency.CLP)
    assert not fits_currency(Decimal("100.5"), Currency.CLP)
    assert fits_currency(Decimal("100.55"), Currency.USD)
    assert percentage(Decimal("1"), Decimal("3")) == Decimal("33.33")
    assert percentage(Decimal("1"), Decimal("0")) is None
    assert percent_change(Decimal("50"), Decimal("-100")) == Decimal("150.00")
    assert percent_change(Decimal("50"), Decimal("0")) is None


def test_date_helpers() -> None:
    assert parse_month("2026-02") == (2026, 2)
    with pytest.raises(ValueError):
        parse_month("2026-2")
    assert shift_month(2026, 1, -1) == (2025, 12)
    assert shift_month(2026, 11, 3) == (2027, 2)
    assert month_bounds(2024, 2)[1].day == 29


def test_csv_sanitizer() -> None:
    assert sanitize_csv_text("=1+1") == "'=1+1"
    assert sanitize_csv_text("-5") == "'-5"
    assert sanitize_csv_text("@SUM(A1)") == "'@SUM(A1)"
    assert sanitize_csv_text("normal") == "normal"
    assert sanitize_csv_text(None) == ""


def test_rate_limiter_sliding_window() -> None:
    now = [0.0]
    limiter = SlidingWindowRateLimiter(clock=lambda: now[0])
    for _ in range(3):
        limiter.hit("k", limit=3, window_seconds=10)
    with pytest.raises(RateLimitError) as exc:
        limiter.hit("k", limit=3, window_seconds=10)
    assert exc.value.retry_after == 10
    limiter.hit("other", limit=3, window_seconds=10)  # independent keys
    now[0] = 10.5
    limiter.hit("k", limit=3, window_seconds=10)  # window slid


def test_migrations_match_models(tmp_path: Path, alembic_ini: Path) -> None:
    url = f"sqlite:///{(tmp_path / 'migrations.db').as_posix()}"
    config = Config(str(alembic_ini))
    config.set_main_option("sqlalchemy.url", url)

    command.upgrade(config, "head")
    engine = create_engine(url)
    with engine.connect() as connection:
        diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    assert diff == []

    command.downgrade(config, "base")
    command.upgrade(config, "head")
    engine.dispose()


def test_seed_creates_demo_data_idempotently(db: Session) -> None:
    user = seed(db, months=6)
    assert user is not None
    count = db.scalar(select(func.count(Transaction.id)).where(Transaction.user_id == user.id))
    assert count and count > 50

    assert seed(db) is None  # already exists, untouched
    recreated = seed(db, reset=True, months=3)
    assert recreated is not None and recreated.id != user.id
    assert db.scalar(select(func.count(User.id)).where(User.email == DEMO_EMAIL)) == 1
    orphaned = db.scalar(select(func.count(Transaction.id)).where(Transaction.user_id == user.id))
    assert orphaned == 0


def test_seeded_user_can_log_in(client: TestClient, db: Session) -> None:
    seed(db, months=2)
    response = client.post("/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": "Demo1234"})
    assert response.status_code == 200
    summary = client.get("/api/v1/dashboard/summary")
    assert summary.status_code == 200
