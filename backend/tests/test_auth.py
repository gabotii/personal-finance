from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient

from app.core.config import Settings
from tests.conftest import DEFAULT_PASSWORD, create_transaction, register


def test_register_creates_user_session_and_default_categories(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana Pérez", "email": "Ana@Example.com", "password": DEFAULT_PASSWORD},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["message"] == "Cuenta creada"
    user = body["data"]
    assert user["email"] == "ana@example.com"
    assert user["currency"] == "CLP"
    assert user["timezone"] == "America/Santiago"
    assert user["theme"] == "SYSTEM"
    assert "password" not in user and "password_hash" not in user

    set_cookie = response.headers["set-cookie"].lower()
    assert "pf_session=" in set_cookie
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie

    categories = client.get("/api/v1/categories").json()["data"]
    assert len(categories) == 16
    assert {c["type"] for c in categories} == {"INCOME", "EXPENSE"}


def test_register_duplicate_email_is_conflict(client: TestClient) -> None:
    register(client, email="dup@example.com")
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Otro", "email": "DUP@example.com", "password": DEFAULT_PASSWORD},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


def test_register_rejects_weak_password_and_bad_email(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": "not-an-email", "password": "short"},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert set(error["details"]["fields"]) == {"email", "password"}


def test_register_with_preferences(client: TestClient) -> None:
    user = register(client, email="usd@example.com", currency="USD", timezone="Europe/Madrid")
    assert user["currency"] == "USD"
    assert user["timezone"] == "Europe/Madrid"


def test_register_rejects_invalid_timezone(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Ana",
            "email": "tz@example.com",
            "password": DEFAULT_PASSWORD,
            "timezone": "Mars/Olympus",
        },
    )
    assert response.status_code == 422
    assert "timezone" in response.json()["error"]["details"]["fields"]


def test_login_success(make_client: Callable[[], TestClient]) -> None:
    register(make_client(), email="login@example.com")
    client = make_client()

    response = client.post(
        "/api/v1/auth/login", json={"email": "LOGIN@example.com", "password": DEFAULT_PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()["data"]["email"] == "login@example.com"
    assert client.get("/api/v1/auth/me").status_code == 200


def test_login_invalid_password(make_client: Callable[[], TestClient]) -> None:
    register(make_client(), email="login@example.com")
    response = make_client().post(
        "/api/v1/auth/login", json={"email": "login@example.com", "password": "Incorrecta99"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert "set-cookie" not in response.headers


def test_login_unknown_email_gives_same_error(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login", json={"email": "nadie@example.com", "password": DEFAULT_PASSWORD}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_unauthorized_endpoints_return_error_envelope(client: TestClient) -> None:
    for method, path in [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/transactions"),
        ("POST", "/api/v1/transactions"),
        ("GET", "/api/v1/categories"),
        ("GET", "/api/v1/dashboard/summary"),
        ("GET", "/api/v1/export/csv"),
        ("PATCH", "/api/v1/users/me"),
    ]:
        response = client.request(method, path, json={} if method != "GET" else None)
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "UNAUTHORIZED", path


def test_forged_session_cookie_is_rejected(client: TestClient) -> None:
    client.cookies.set("pf_session", "forged-token-value")
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"


def test_logout_revokes_session_server_side(auth_client: TestClient) -> None:
    token = auth_client.cookies.get("pf_session")
    assert token

    response = auth_client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"data": None, "message": "Sesión cerrada"}

    # Replaying the old cookie must not work: the session no longer exists.
    auth_client.cookies.set("pf_session", token)
    assert auth_client.get("/api/v1/auth/me").status_code == 401


def test_login_is_rate_limited(client: TestClient, settings: Settings) -> None:
    payload = {"email": "nadie@example.com", "password": "Incorrecta99"}
    for _ in range(settings.login_rate_limit):
        assert client.post("/api/v1/auth/login", json=payload).status_code == 401
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "RATE_LIMITED"
    assert int(response.headers["retry-after"]) >= 1


def test_change_password_revokes_other_sessions(
    make_client: Callable[[], TestClient],
) -> None:
    first = make_client()
    register(first, email="pw@example.com")
    second = make_client()
    assert (
        second.post(
            "/api/v1/auth/login", json={"email": "pw@example.com", "password": DEFAULT_PASSWORD}
        ).status_code
        == 200
    )

    wrong = first.post(
        "/api/v1/users/me/password",
        json={"current_password": "NoEsLaMia1", "new_password": "NuevaClave2025"},
    )
    assert wrong.status_code == 422
    assert "current_password" in wrong.json()["error"]["details"]["fields"]

    response = first.post(
        "/api/v1/users/me/password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "NuevaClave2025"},
    )
    assert response.status_code == 200
    assert first.get("/api/v1/auth/me").status_code == 200
    assert second.get("/api/v1/auth/me").status_code == 401

    relogin = make_client().post(
        "/api/v1/auth/login", json={"email": "pw@example.com", "password": "NuevaClave2025"}
    )
    assert relogin.status_code == 200


def test_update_profile_preferences(auth_client: TestClient) -> None:
    response = auth_client.patch(
        "/api/v1/users/me",
        json={"name": "Ana María", "theme": "DARK", "timezone": "America/Bogota"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["name"] == "Ana María"
    assert data["theme"] == "DARK"
    assert data["timezone"] == "America/Bogota"
    assert auth_client.get("/api/v1/auth/me").json()["data"]["theme"] == "DARK"


def test_currency_change_blocked_when_amounts_have_cents(
    make_auth_client: Callable[..., TestClient],
) -> None:
    client = make_auth_client("usd@example.com", currency="USD")
    create_transaction(client, amount="10.50")

    blocked = client.patch("/api/v1/users/me", json={"currency": "CLP"})
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "CURRENCY_CHANGE_BLOCKED"

    assert client.patch("/api/v1/users/me", json={"currency": "EUR"}).status_code == 200
