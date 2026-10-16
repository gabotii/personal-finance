from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import categories_by_name, create_transaction


def test_default_categories(auth_client: TestClient) -> None:
    expense = categories_by_name(auth_client, "EXPENSE")
    income = categories_by_name(auth_client, "INCOME")
    assert set(expense) == {
        "Alimentación",
        "Vivienda",
        "Transporte",
        "Salud",
        "Educación",
        "Entretenimiento",
        "Compras",
        "Servicios",
        "Suscripciones",
        "Viajes",
        "Otros",
    }
    assert set(income) == {"Salario", "Freelance", "Negocio", "Inversiones", "Otros"}
    assert all(c["is_active"] and c["transaction_count"] == 0 for c in expense.values())


def test_create_category(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/categories",
        json={"name": "Mascotas", "type": "EXPENSE", "color": "#0EA5E9", "icon": "paw-print"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["name"] == "Mascotas"
    assert data["color"] == "#0ea5e9"
    assert data["is_active"] is True
    assert data["transaction_count"] == 0


def test_create_category_validation(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/v1/categories",
        json={"name": " ", "type": "EXPENSE", "color": "blue", "icon": "not-an-icon"},
    )
    assert response.status_code == 422
    assert set(response.json()["error"]["details"]["fields"]) == {"name", "color", "icon"}


def test_duplicate_name_is_case_insensitive_per_type(auth_client: TestClient) -> None:
    duplicate = auth_client.post(
        "/api/v1/categories",
        json={"name": "salud", "type": "EXPENSE", "color": "#ef4444", "icon": "heart-pulse"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "CATEGORY_EXISTS"

    other_type = auth_client.post(
        "/api/v1/categories",
        json={"name": "Salud", "type": "INCOME", "color": "#ef4444", "icon": "heart-pulse"},
    )
    assert other_type.status_code == 201


def test_update_and_toggle_category(auth_client: TestClient) -> None:
    category = categories_by_name(auth_client)["Compras"]
    response = auth_client.patch(
        f"/api/v1/categories/{category['id']}",
        json={"name": "Compras online", "color": "#123456", "icon": "smartphone"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Compras online"

    deactivated = auth_client.patch(
        f"/api/v1/categories/{category['id']}", json={"is_active": False}
    )
    assert deactivated.json()["data"]["is_active"] is False

    active_only = auth_client.get("/api/v1/categories", params={"include_inactive": False}).json()[
        "data"
    ]
    assert category["id"] not in {c["id"] for c in active_only}


def test_rename_to_existing_name_is_conflict(auth_client: TestClient) -> None:
    category = categories_by_name(auth_client)["Compras"]
    response = auth_client.patch(f"/api/v1/categories/{category['id']}", json={"name": "SALUD"})
    assert response.status_code == 409


def test_type_change_locked_when_in_use(auth_client: TestClient) -> None:
    category = categories_by_name(auth_client)["Compras"]
    create_transaction(auth_client, category_id=category["id"])
    response = auth_client.patch(f"/api/v1/categories/{category['id']}", json={"type": "INCOME"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CATEGORY_TYPE_LOCKED"


def test_delete_unused_category(auth_client: TestClient) -> None:
    category = categories_by_name(auth_client)["Viajes"]
    response = auth_client.delete(f"/api/v1/categories/{category['id']}")
    assert response.status_code == 204
    assert "Viajes" not in categories_by_name(auth_client)


def test_delete_category_in_use_requires_reassignment(auth_client: TestClient) -> None:
    categories = categories_by_name(auth_client)
    source, target = categories["Compras"], categories["Otros"]
    created = create_transaction(auth_client, category_id=source["id"])
    create_transaction(auth_client, category_id=source["id"])

    blocked = auth_client.delete(f"/api/v1/categories/{source['id']}")
    assert blocked.status_code == 409
    error = blocked.json()["error"]
    assert error["code"] == "CATEGORY_IN_USE"
    assert error["details"]["transaction_count"] == 2

    salary = categories_by_name(auth_client, "INCOME")["Salario"]
    wrong_type = auth_client.delete(
        f"/api/v1/categories/{source['id']}", params={"reassign_to": salary["id"]}
    )
    assert wrong_type.status_code == 422

    same = auth_client.delete(
        f"/api/v1/categories/{source['id']}", params={"reassign_to": source["id"]}
    )
    assert same.status_code == 422

    moved = auth_client.delete(
        f"/api/v1/categories/{source['id']}", params={"reassign_to": target["id"]}
    )
    assert moved.status_code == 204

    transaction = auth_client.get(f"/api/v1/transactions/{created['id']}").json()["data"]
    assert transaction["category"]["id"] == target["id"]
    assert categories_by_name(auth_client)["Otros"]["transaction_count"] == 2


def test_transaction_count_in_listing(auth_client: TestClient) -> None:
    category = categories_by_name(auth_client)["Salud"]
    create_transaction(auth_client, category_id=category["id"])
    assert categories_by_name(auth_client)["Salud"]["transaction_count"] == 1
