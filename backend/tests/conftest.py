from __future__ import annotations

import os

# Must be set before any `app.*` import reads settings.
os.environ["APP_ENV"] = "test"
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-used-in-production-000000")
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["LOG_LEVEL"] = "WARNING"

from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db
from app.core.config import Settings, get_settings
from app.core.rate_limit import auth_rate_limiter
from app.db.base import Base
from app.db.database import build_engine
from app.main import create_app

DEFAULT_PASSWORD = "Segura2024"


@pytest.fixture(scope="session")
def engine(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Engine]:
    url = os.environ.get("TEST_DATABASE_URL") or (
        f"sqlite:///{(tmp_path_factory.mktemp('db') / 'test.db').as_posix()}"
    )
    test_engine = build_engine(url)
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield test_engine
    Base.metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture(scope="session")
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(autouse=True)
def _clean_database(engine: Engine) -> Iterator[None]:
    yield
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> Iterator[None]:
    auth_rate_limiter.reset()
    yield
    auth_rate_limiter.reset()


@pytest.fixture
def settings() -> Settings:
    return get_settings()


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def app(session_factory: sessionmaker[Session], settings: Settings) -> FastAPI:
    application = create_app(settings)

    def override_get_db() -> Iterator[Session]:
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
def make_client(app: FastAPI) -> Iterator[Callable[[], TestClient]]:
    clients: list[TestClient] = []

    def factory() -> TestClient:
        client = TestClient(app, base_url="http://testserver")
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.close()


@pytest.fixture
def client(make_client: Callable[[], TestClient]) -> TestClient:
    return make_client()


def register(
    client: TestClient,
    email: str = "ana@example.com",
    password: str = DEFAULT_PASSWORD,
    **extra: Any,
) -> dict[str, Any]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": extra.pop("name", "Ana Pérez"),
            "email": email,
            "password": password,
            **extra,
        },
    )
    assert response.status_code == 201, response.text
    data: dict[str, Any] = response.json()["data"]
    return data


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    """A client with a registered, logged-in user (CLP)."""
    register(client)
    return client


@pytest.fixture
def make_auth_client(make_client: Callable[[], TestClient]) -> Callable[..., TestClient]:
    def factory(email: str, **extra: Any) -> TestClient:
        new_client = make_client()
        register(new_client, email=email, **extra)
        return new_client

    return factory


def categories_by_name(client: TestClient, type_: str = "EXPENSE") -> dict[str, dict[str, Any]]:
    response = client.get("/api/v1/categories", params={"type": type_})
    assert response.status_code == 200, response.text
    return {item["name"]: item for item in response.json()["data"]}


def create_transaction(client: TestClient, **fields: Any) -> dict[str, Any]:
    type_ = fields.get("type", "EXPENSE")
    if "category_id" not in fields:
        default_name = "Alimentación" if type_ == "EXPENSE" else "Salario"
        fields["category_id"] = categories_by_name(client, type_)[default_name]["id"]
    payload = {
        "type": type_,
        "amount": "10000",
        "description": "Movimiento de prueba",
        "transaction_date": "2026-09-15",
        **fields,
    }
    response = client.post("/api/v1/transactions", json=payload)
    assert response.status_code == 201, response.text
    data: dict[str, Any] = response.json()["data"]
    return data


@pytest.fixture
def alembic_ini() -> Path:
    return Path(__file__).resolve().parents[1] / "alembic.ini"
