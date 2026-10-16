from __future__ import annotations

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from tests.conftest import categories_by_name, create_transaction


def test_create_and_read_transaction(auth_client: TestClient) -> None:
    category = categories_by_name(auth_client)["Transporte"]
    response = auth_client.post(
        "/api/v1/transactions",
        json={
            "type": "EXPENSE",
            "amount": "25000",
            "description": "  Bencina  ",
            "notes": "Estanque lleno",
            "category_id": category["id"],
            "transaction_date": "2026-10-04",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["message"] == "Movimiento creado"
    created = body["data"]
    assert created["amount"] == "25000.00"
    assert created["description"] == "Bencina"
    assert created["category"]["name"] == "Transporte"
    assert created["transaction_date"] == "2026-10-04"

    fetched = auth_client.get(f"/api/v1/transactions/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["data"] == created


def test_update_transaction_partial_fields(auth_client: TestClient) -> None:
    created = create_transaction(auth_client, notes="Nota inicial")
    health = categories_by_name(auth_client)["Salud"]

    response = auth_client.patch(
        f"/api/v1/transactions/{created['id']}",
        json={"amount": "15990", "category_id": health["id"], "notes": None},
    )

    assert response.status_code == 200
    updated = response.json()["data"]
    assert updated["amount"] == "15990.00"
    assert updated["category"]["id"] == health["id"]
    assert updated["notes"] is None
    assert updated["description"] == created["description"]


def test_update_type_requires_matching_category(auth_client: TestClient) -> None:
    created = create_transaction(auth_client)
    mismatch = auth_client.patch(f"/api/v1/transactions/{created['id']}", json={"type": "INCOME"})
    assert mismatch.status_code == 422
    assert "category_id" in mismatch.json()["error"]["details"]["fields"]

    salary = categories_by_name(auth_client, "INCOME")["Salario"]
    ok = auth_client.patch(
        f"/api/v1/transactions/{created['id']}",
        json={"type": "INCOME", "category_id": salary["id"]},
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["type"] == "INCOME"


def test_update_rejects_null_for_required_fields(auth_client: TestClient) -> None:
    created = create_transaction(auth_client)
    response = auth_client.patch(
        f"/api/v1/transactions/{created['id']}", json={"description": None}
    )
    assert response.status_code == 422


def test_delete_transaction(auth_client: TestClient) -> None:
    created = create_transaction(auth_client)
    response = auth_client.delete(f"/api/v1/transactions/{created['id']}")
    assert response.status_code == 204
    assert response.content == b""
    assert auth_client.get(f"/api/v1/transactions/{created['id']}").status_code == 404
    assert auth_client.delete(f"/api/v1/transactions/{created['id']}").status_code == 404


@pytest.mark.parametrize(
    ("amount", "field_expected"),
    [("0", True), ("-100", True), ("1000.555", True), ("abc", True), ("1e20", True)],
)
def test_create_rejects_invalid_amounts(
    auth_client: TestClient, amount: str, field_expected: bool
) -> None:
    category = categories_by_name(auth_client)["Compras"]
    response = auth_client.post(
        "/api/v1/transactions",
        json={
            "type": "EXPENSE",
            "amount": amount,
            "description": "X",
            "category_id": category["id"],
            "transaction_date": "2026-10-01",
        },
    )
    assert response.status_code == 422
    assert ("amount" in response.json()["error"]["details"]["fields"]) is field_expected


def test_clp_rejects_cents_but_usd_accepts_them(
    auth_client: TestClient, make_auth_client: Callable[..., TestClient]
) -> None:
    category = categories_by_name(auth_client)["Compras"]
    payload = {
        "type": "EXPENSE",
        "amount": "1500.50",
        "description": "Café",
        "category_id": category["id"],
        "transaction_date": "2026-10-01",
    }
    clp = auth_client.post("/api/v1/transactions", json=payload)
    assert clp.status_code == 422
    assert "amount" in clp.json()["error"]["details"]["fields"]

    usd_client = make_auth_client("usd@example.com", currency="USD")
    created = create_transaction(usd_client, amount="15.50")
    assert created["amount"] == "15.50"


def test_create_rejects_category_of_other_type(auth_client: TestClient) -> None:
    salary = categories_by_name(auth_client, "INCOME")["Salario"]
    response = auth_client.post(
        "/api/v1/transactions",
        json={
            "type": "EXPENSE",
            "amount": "1000",
            "description": "X",
            "category_id": salary["id"],
            "transaction_date": "2026-10-01",
        },
    )
    assert response.status_code == 422
    assert "category_id" in response.json()["error"]["details"]["fields"]


def test_create_rejects_inactive_category(auth_client: TestClient) -> None:
    travel = categories_by_name(auth_client)["Viajes"]
    auth_client.patch(f"/api/v1/categories/{travel['id']}", json={"is_active": False})
    response = auth_client.post(
        "/api/v1/transactions",
        json={
            "type": "EXPENSE",
            "amount": "1000",
            "description": "Pasaje",
            "category_id": travel["id"],
            "transaction_date": "2026-10-01",
        },
    )
    assert response.status_code == 422


def _seed_for_filters(client: TestClient) -> dict[str, dict[str, str]]:
    expense = categories_by_name(client)
    income = categories_by_name(client, "INCOME")
    create_transaction(
        client,
        amount="5000",
        description="Café con leche",
        category_id=expense["Alimentación"]["id"],
        transaction_date="2026-08-03",
    )
    create_transaction(
        client,
        amount="45000",
        description="Supermercado Lider",
        category_id=expense["Alimentación"]["id"],
        transaction_date="2026-09-10",
    )
    create_transaction(
        client,
        amount="12000",
        description="Uber al aeropuerto",
        notes="Viaje de trabajo 100%",
        category_id=expense["Transporte"]["id"],
        transaction_date="2026-09-20",
    )
    create_transaction(
        client,
        type="INCOME",
        amount="1500000",
        description="Sueldo",
        category_id=income["Salario"]["id"],
        transaction_date="2026-09-01",
    )
    create_transaction(
        client,
        type="INCOME",
        amount="300000",
        description="Proyecto web",
        category_id=income["Freelance"]["id"],
        transaction_date="2026-10-02",
    )
    return {
        "expense": {k: v["id"] for k, v in expense.items()},
        "income": {k: v["id"] for k, v in income.items()},
    }


def _descriptions(client: TestClient, **params: str | int) -> list[str]:
    response = client.get("/api/v1/transactions", params=params)
    assert response.status_code == 200, response.text
    return [item["description"] for item in response.json()["data"]["items"]]


def test_filters_individually_and_combined(auth_client: TestClient) -> None:
    ids = _seed_for_filters(auth_client)

    assert _descriptions(auth_client) == [
        "Proyecto web",
        "Uber al aeropuerto",
        "Supermercado Lider",
        "Sueldo",
        "Café con leche",
    ]
    assert _descriptions(auth_client, date_from="2026-09-01", date_to="2026-09-30") == [
        "Uber al aeropuerto",
        "Supermercado Lider",
        "Sueldo",
    ]
    assert _descriptions(auth_client, type="INCOME") == ["Proyecto web", "Sueldo"]
    assert _descriptions(auth_client, category_id=ids["expense"]["Alimentación"]) == [
        "Supermercado Lider",
        "Café con leche",
    ]
    assert _descriptions(auth_client, q="super") == ["Supermercado Lider"]
    assert _descriptions(auth_client, q="trabajo") == ["Uber al aeropuerto"]  # notes
    assert _descriptions(auth_client, q="freelance") == ["Proyecto web"]  # category name
    assert _descriptions(auth_client, min_amount="10000", max_amount="50000") == [
        "Uber al aeropuerto",
        "Supermercado Lider",
    ]
    assert _descriptions(
        auth_client, type="EXPENSE", date_from="2026-09-01", min_amount="20000"
    ) == ["Supermercado Lider"]


def test_search_treats_wildcards_literally(auth_client: TestClient) -> None:
    _seed_for_filters(auth_client)
    assert _descriptions(auth_client, q="100%") == ["Uber al aeropuerto"]
    assert _descriptions(auth_client, q="%") == ["Uber al aeropuerto"]
    assert _descriptions(auth_client, q="_") == []


def test_sorting(auth_client: TestClient) -> None:
    _seed_for_filters(auth_client)
    assert _descriptions(auth_client, sort="amount_asc")[:2] == [
        "Café con leche",
        "Uber al aeropuerto",
    ]
    assert _descriptions(auth_client, sort="date_asc")[0] == "Café con leche"


def test_invalid_filters_are_rejected(auth_client: TestClient) -> None:
    for params, field in [
        ({"date_from": "2026-10-01", "date_to": "2026-09-01"}, "date_to"),
        ({"min_amount": "500", "max_amount": "100"}, "max_amount"),
        ({"page_size": 7}, "page_size"),
        ({"page": 0}, "page"),
        ({"type": "OTHER"}, "type"),
        ({"sort": "random"}, "sort"),
    ]:
        response = auth_client.get("/api/v1/transactions", params=params)
        assert response.status_code == 422, params
        assert field in response.json()["error"]["details"]["fields"], params


def test_pagination_metadata(auth_client: TestClient) -> None:
    category_id = categories_by_name(auth_client)["Alimentación"]["id"]
    for day in range(1, 28):
        create_transaction(
            auth_client,
            category_id=category_id,
            description=f"Compra {day:02d}",
            transaction_date=f"2026-09-{day:02d}",
        )

    first = auth_client.get("/api/v1/transactions", params={"page_size": 10}).json()["data"]
    assert first["total"] == 27
    assert first["page"] == 1
    assert first["page_size"] == 10
    assert first["total_pages"] == 3
    assert len(first["items"]) == 10
    assert first["items"][0]["description"] == "Compra 27"

    last = auth_client.get("/api/v1/transactions", params={"page_size": 10, "page": 3}).json()[
        "data"
    ]
    assert len(last["items"]) == 7
    assert last["items"][-1]["description"] == "Compra 01"

    beyond = auth_client.get("/api/v1/transactions", params={"page_size": 10, "page": 9}).json()[
        "data"
    ]
    assert beyond["items"] == []
    assert beyond["total"] == 27

    all_ids = {
        item["id"]
        for page in (1, 2, 3)
        for item in auth_client.get(
            "/api/v1/transactions", params={"page_size": 10, "page": page}
        ).json()["data"]["items"]
    }
    assert len(all_ids) == 27


def test_empty_listing(auth_client: TestClient) -> None:
    data = auth_client.get("/api/v1/transactions").json()["data"]
    assert data == {"items": [], "total": 0, "page": 1, "page_size": 25, "total_pages": 0}


def test_unknown_transaction_returns_404(auth_client: TestClient) -> None:
    response = auth_client.get("/api/v1/transactions/00000000-0000-4000-8000-000000000000")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
    assert auth_client.get("/api/v1/transactions/not-a-uuid").status_code == 422
