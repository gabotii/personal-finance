"""User isolation (IDOR) and HTTP hardening."""

from __future__ import annotations

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from tests.conftest import categories_by_name, create_transaction


@pytest.fixture
def two_users(
    make_auth_client: Callable[..., TestClient],
) -> tuple[TestClient, TestClient]:
    return make_auth_client("alice@example.com"), make_auth_client("bob@example.com")


def test_user_cannot_read_update_or_delete_others_transactions(
    two_users: tuple[TestClient, TestClient],
) -> None:
    alice, bob = two_users
    secret = create_transaction(alice, description="Secreto de Alice", amount="999000")
    url = f"/api/v1/transactions/{secret['id']}"

    assert bob.get(url).status_code == 404
    assert bob.patch(url, json={"amount": "1"}).status_code == 404
    assert bob.delete(url).status_code == 404

    unchanged = alice.get(url).json()["data"]
    assert unchanged["amount"] == "999000.00"


def test_listings_and_aggregates_are_scoped_to_the_user(
    two_users: tuple[TestClient, TestClient],
) -> None:
    alice, bob = two_users
    create_transaction(alice, description="Secreto de Alice", amount="999000")

    assert bob.get("/api/v1/transactions").json()["data"]["total"] == 0
    assert bob.get("/api/v1/transactions", params={"q": "Secreto"}).json()["data"]["items"] == []

    summary = bob.get("/api/v1/dashboard/summary", params={"month": "2026-09"}).json()["data"]
    assert summary["current"]["expense"] == "0.00"
    assert summary["balance"] == "0.00"

    breakdown = bob.get(
        "/api/v1/dashboard/categories",
        params={"date_from": "2026-01-01", "date_to": "2026-12-31"},
    ).json()["data"]
    assert breakdown["items"] == []

    csv_body = bob.get("/api/v1/export/csv").content.decode("utf-8-sig")
    assert "Secreto" not in csv_body


def test_user_cannot_use_or_modify_others_categories(
    two_users: tuple[TestClient, TestClient],
) -> None:
    alice, bob = two_users
    alice_category = categories_by_name(alice)["Salud"]

    create = bob.post(
        "/api/v1/transactions",
        json={
            "type": "EXPENSE",
            "amount": "1000",
            "description": "Intento",
            "category_id": alice_category["id"],
            "transaction_date": "2026-09-01",
        },
    )
    assert create.status_code == 422
    assert "category_id" in create.json()["error"]["details"]["fields"]

    url = f"/api/v1/categories/{alice_category['id']}"
    assert bob.patch(url, json={"name": "Hackeada"}).status_code == 404
    assert bob.delete(url).status_code == 404
    assert alice_category["id"] not in {
        c["id"] for c in bob.get("/api/v1/categories").json()["data"]
    }
    assert categories_by_name(alice)["Salud"]["name"] == "Salud"


def test_user_cannot_move_transaction_into_others_category(
    two_users: tuple[TestClient, TestClient],
) -> None:
    alice, bob = two_users
    bob_transaction = create_transaction(bob)
    alice_category = categories_by_name(alice)["Salud"]
    response = bob.patch(
        f"/api/v1/transactions/{bob_transaction['id']}",
        json={"category_id": alice_category["id"]},
    )
    assert response.status_code == 422


def test_user_cannot_reassign_into_others_category(
    two_users: tuple[TestClient, TestClient],
) -> None:
    alice, bob = two_users
    bob_category = categories_by_name(bob)["Compras"]
    create_transaction(bob, category_id=bob_category["id"])
    alice_target = categories_by_name(alice)["Otros"]
    response = bob.delete(
        f"/api/v1/categories/{bob_category['id']}", params={"reassign_to": alice_target["id"]}
    )
    assert response.status_code == 422


def test_cross_site_state_changing_request_is_rejected(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/transactions", json={}, headers={"Origin": "https://evil.example"}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN_ORIGIN"

    allowed = auth_client.post("/api/v1/auth/logout", headers={"Origin": "http://localhost:5173"})
    assert allowed.status_code == 200


def test_security_headers(client: TestClient) -> None:
    response = client.get("/health")
    headers = response.headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "default-src 'none'" in headers["content-security-policy"]
    assert headers["x-request-id"]


def test_cors_preflight_only_for_configured_origins(client: TestClient) -> None:
    allowed = client.options(
        "/api/v1/transactions",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert allowed.headers["access-control-allow-credentials"] == "true"

    denied = client.options(
        "/api/v1/transactions",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in denied.headers


def test_errors_never_leak_internals(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/transactions", content=b"{not json", headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"error"}
    assert "Traceback" not in response.text
