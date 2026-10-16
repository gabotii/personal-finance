from __future__ import annotations

from collections.abc import Callable
from decimal import Decimal

from fastapi.testclient import TestClient

from app.services.dashboard_service import savings_rate
from tests.conftest import categories_by_name, create_transaction


def _seed(client: TestClient) -> None:
    expense = categories_by_name(client)
    income = categories_by_name(client, "INCOME")
    # August 2026
    create_transaction(
        client,
        type="INCOME",
        amount="1000000",
        category_id=income["Salario"]["id"],
        transaction_date="2026-08-01",
    )
    create_transaction(
        client,
        amount="400000",
        category_id=expense["Vivienda"]["id"],
        transaction_date="2026-08-05",
    )
    # September 2026
    create_transaction(
        client,
        type="INCOME",
        amount="1200000",
        category_id=income["Salario"]["id"],
        transaction_date="2026-09-01",
    )
    create_transaction(
        client,
        type="INCOME",
        amount="300000",
        category_id=income["Freelance"]["id"],
        transaction_date="2026-09-15",
    )
    create_transaction(
        client,
        amount="450000",
        category_id=expense["Vivienda"]["id"],
        transaction_date="2026-09-05",
    )
    create_transaction(
        client,
        amount="150000",
        category_id=expense["Alimentación"]["id"],
        transaction_date="2026-09-05",
    )
    create_transaction(
        client,
        amount="100000",
        category_id=expense["Alimentación"]["id"],
        transaction_date="2026-09-20",
    )
    # October 2026 (after September; must not affect September's balance)
    create_transaction(
        client,
        amount="50000",
        category_id=expense["Transporte"]["id"],
        transaction_date="2026-10-02",
    )


def test_summary_totals_balance_and_savings_rate(auth_client: TestClient) -> None:
    _seed(auth_client)
    data = auth_client.get("/api/v1/dashboard/summary", params={"month": "2026-09"}).json()["data"]

    assert data["month"] == "2026-09"
    assert data["currency"] == "CLP"
    current = data["current"]
    assert current["income"] == "1500000.00"
    assert current["expense"] == "700000.00"
    assert current["net"] == "800000.00"
    assert current["savings_rate"] == "53.33"
    assert current["transaction_count"] == 5

    # Balance accumulates everything up to the end of the month (Aug + Sep).
    assert data["balance"] == "1400000.00"
    assert data["previous_balance"] == "600000.00"
    assert data["balance_change_pct"] == "133.33"

    previous = data["previous"]
    assert previous["income"] == "1000000.00"
    assert previous["expense"] == "400000.00"
    assert previous["savings_rate"] == "60.00"


def test_month_comparison(auth_client: TestClient) -> None:
    _seed(auth_client)
    comparison = auth_client.get("/api/v1/dashboard/summary", params={"month": "2026-09"}).json()[
        "data"
    ]["comparison"]

    assert comparison["income"] == {
        "current": "1500000.00",
        "previous": "1000000.00",
        "difference": "500000.00",
        "difference_pct": "50.00",
    }
    assert comparison["expense"]["difference"] == "300000.00"
    assert comparison["expense"]["difference_pct"] == "75.00"
    assert comparison["net"]["difference_pct"] == "33.33"


def test_savings_rate_is_null_without_income(auth_client: TestClient) -> None:
    create_transaction(auth_client, amount="20000", transaction_date="2026-07-10")
    data = auth_client.get("/api/v1/dashboard/summary", params={"month": "2026-07"}).json()["data"]
    assert data["current"]["income"] == "0.00"
    assert data["current"]["savings_rate"] is None
    assert data["comparison"]["expense"]["difference_pct"] is None  # previous month was 0
    assert data["balance"] == "-20000.00"


def test_savings_rate_function() -> None:
    assert savings_rate(Decimal("1000"), Decimal("250")) == Decimal("75.00")
    assert savings_rate(Decimal("1000"), Decimal("1500")) == Decimal("-50.00")
    assert savings_rate(Decimal("0"), Decimal("100")) is None
    assert savings_rate(Decimal("0"), Decimal("0")) is None


def test_monthly_series_zero_fills_and_accumulates_balance(auth_client: TestClient) -> None:
    _seed(auth_client)
    items = auth_client.get(
        "/api/v1/dashboard/monthly", params={"months": 4, "end_month": "2026-10"}
    ).json()["data"]["items"]

    assert [i["month"] for i in items] == ["2026-07", "2026-08", "2026-09", "2026-10"]
    assert items[0] == {
        "month": "2026-07",
        "income": "0.00",
        "expense": "0.00",
        "net": "0.00",
        "balance": "0.00",
    }
    assert items[1]["net"] == "600000.00"
    assert items[1]["balance"] == "600000.00"
    assert items[2]["income"] == "1500000.00"
    assert items[2]["balance"] == "1400000.00"
    assert items[3]["expense"] == "50000.00"
    assert items[3]["balance"] == "1350000.00"


def test_monthly_opening_balance_includes_earlier_months(auth_client: TestClient) -> None:
    _seed(auth_client)
    items = auth_client.get(
        "/api/v1/dashboard/monthly", params={"months": 1, "end_month": "2026-09"}
    ).json()["data"]["items"]
    assert items == [
        {
            "month": "2026-09",
            "income": "1500000.00",
            "expense": "700000.00",
            "net": "800000.00",
            "balance": "1400000.00",
        },
    ]


def test_category_breakdown(auth_client: TestClient) -> None:
    _seed(auth_client)
    data = auth_client.get(
        "/api/v1/dashboard/categories",
        params={"date_from": "2026-09-01", "date_to": "2026-09-30"},
    ).json()["data"]

    assert data["type"] == "EXPENSE"
    assert data["total"] == "700000.00"
    assert [
        (i["name"], i["total"], i["percentage"], i["transaction_count"]) for i in data["items"]
    ] == [
        ("Vivienda", "450000.00", "64.29", 1),
        ("Alimentación", "250000.00", "35.71", 2),
    ]

    income = auth_client.get(
        "/api/v1/dashboard/categories",
        params={"type": "INCOME", "date_from": "2026-09-01", "date_to": "2026-09-30"},
    ).json()["data"]
    assert [i["name"] for i in income["items"]] == ["Salario", "Freelance"]
    assert income["items"][0]["percentage"] == "80.00"


def test_daily_series(auth_client: TestClient) -> None:
    _seed(auth_client)
    data = auth_client.get("/api/v1/dashboard/daily", params={"month": "2026-09"}).json()["data"]
    assert data["month"] == "2026-09"
    assert len(data["items"]) == 30
    by_day = {item["date"]: item for item in data["items"]}
    assert by_day["2026-09-05"] == {
        "date": "2026-09-05",
        "income": "0.00",
        "expense": "600000.00",
        "net": "-600000.00",
    }
    assert by_day["2026-09-01"]["income"] == "1200000.00"
    assert by_day["2026-09-02"]["expense"] == "0.00"


def test_february_daily_series_length(auth_client: TestClient) -> None:
    data = auth_client.get("/api/v1/dashboard/daily", params={"month": "2028-02"}).json()["data"]
    assert len(data["items"]) == 29


def test_invalid_dashboard_params(auth_client: TestClient) -> None:
    assert (
        auth_client.get("/api/v1/dashboard/summary", params={"month": "2026-13"}).status_code == 422
    )
    assert auth_client.get("/api/v1/dashboard/daily", params={"month": "sept"}).status_code == 422
    assert auth_client.get("/api/v1/dashboard/monthly", params={"months": 0}).status_code == 422
    assert auth_client.get("/api/v1/dashboard/monthly", params={"months": 25}).status_code == 422
    response = auth_client.get(
        "/api/v1/dashboard/categories", params={"date_from": "2026-09-30", "date_to": "2026-09-01"}
    )
    assert response.status_code == 422


def test_defaults_to_current_month(auth_client: TestClient) -> None:
    data = auth_client.get("/api/v1/dashboard/summary").json()["data"]
    assert len(data["month"]) == 7
    monthly = auth_client.get("/api/v1/dashboard/monthly").json()["data"]["items"]
    assert len(monthly) == 6
    assert monthly[-1]["month"] == data["month"]


def test_decimal_amounts_are_exact(make_auth_client: Callable[..., TestClient]) -> None:
    client = make_auth_client("usd@example.com", currency="USD")
    for _ in range(10):
        create_transaction(client, amount="0.10", transaction_date="2026-09-10")
    data = client.get("/api/v1/dashboard/summary", params={"month": "2026-09"}).json()["data"]
    assert data["current"]["expense"] == "1.00"


def test_period_totals(auth_client: TestClient) -> None:
    _seed(auth_client)
    data = auth_client.get(
        "/api/v1/dashboard/period", params={"date_from": "2026-08-01", "date_to": "2026-09-30"}
    ).json()["data"]
    assert data["date_from"] == "2026-08-01"
    assert data["date_to"] == "2026-09-30"
    assert data["totals"] == {
        "income": "2500000.00",
        "expense": "1100000.00",
        "net": "1400000.00",
        "savings_rate": "56.00",
        "transaction_count": 7,
    }

    invalid = auth_client.get(
        "/api/v1/dashboard/period", params={"date_from": "2026-09-30", "date_to": "2026-09-01"}
    )
    assert invalid.status_code == 422
