from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.core.enums import TransactionType
from app.schemas.common import DataResponse, error_responses
from app.schemas.dashboard import (
    CategoryBreakdown,
    DailySeries,
    DashboardSummary,
    MonthlySeries,
    PeriodSummary,
)
from app.services.dashboard_service import MAX_MONTHS, DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MonthParam = Annotated[
    str | None,
    Query(
        description="Mes en formato AAAA-MM. Por defecto, el mes actual del usuario.",
        examples=["2026-10"],
    ),
]


@router.get(
    "/summary",
    response_model=DataResponse[DashboardSummary],
    responses=error_responses(401, 422),
    summary="Resumen del mes",
)
def summary(
    user: CurrentUser, db: DbSession, month: MonthParam = None
) -> DataResponse[DashboardSummary]:
    """Balance acumulado al cierre del mes, ingresos, gastos, tasa de ahorro y
    comparación con el mes anterior. Los porcentajes son `null` cuando la base es 0."""
    return DataResponse(data=DashboardService(db).summary(user, month))


@router.get(
    "/monthly",
    response_model=DataResponse[MonthlySeries],
    responses=error_responses(401, 422),
    summary="Evolución mensual",
)
def monthly(
    user: CurrentUser,
    db: DbSession,
    months: Annotated[int, Query(ge=1, le=MAX_MONTHS)] = 6,
    end_month: MonthParam = None,
) -> DataResponse[MonthlySeries]:
    return DataResponse(data=DashboardService(db).monthly(user, months, end_month))


@router.get(
    "/period",
    response_model=DataResponse[PeriodSummary],
    responses=error_responses(401, 422),
    summary="Totales de un período",
)
def period(
    user: CurrentUser,
    db: DbSession,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> DataResponse[PeriodSummary]:
    """Ingresos, gastos, balance y tasa de ahorro entre dos fechas (por defecto, el mes actual)."""
    return DataResponse(
        data=DashboardService(db).period(user, date_from=date_from, date_to=date_to)
    )


@router.get(
    "/categories",
    response_model=DataResponse[CategoryBreakdown],
    responses=error_responses(401, 422),
    summary="Totales por categoría",
)
def categories(
    user: CurrentUser,
    db: DbSession,
    type: Annotated[TransactionType, Query()] = TransactionType.EXPENSE,  # noqa: A002
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
) -> DataResponse[CategoryBreakdown]:
    return DataResponse(
        data=DashboardService(db).categories(user, type_=type, date_from=date_from, date_to=date_to)
    )


@router.get(
    "/daily",
    response_model=DataResponse[DailySeries],
    responses=error_responses(401, 422),
    summary="Totales diarios del mes",
)
def daily(user: CurrentUser, db: DbSession, month: MonthParam = None) -> DataResponse[DailySeries]:
    return DataResponse(data=DashboardService(db).daily(user, month))
