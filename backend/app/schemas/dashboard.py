from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.core.enums import Currency, TransactionType


class PeriodTotals(BaseModel):
    income: Decimal
    expense: Decimal
    net: Decimal
    savings_rate: Decimal | None
    transaction_count: int


class PeriodSummary(BaseModel):
    currency: Currency
    date_from: date
    date_to: date
    totals: PeriodTotals


class MetricComparison(BaseModel):
    current: Decimal
    previous: Decimal
    difference: Decimal
    difference_pct: Decimal | None


class MonthComparison(BaseModel):
    income: MetricComparison
    expense: MetricComparison
    net: MetricComparison


class DashboardSummary(BaseModel):
    month: str
    currency: Currency
    balance: Decimal
    previous_balance: Decimal
    balance_change_pct: Decimal | None
    current: PeriodTotals
    previous: PeriodTotals
    comparison: MonthComparison


class MonthlyPoint(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    net: Decimal
    balance: Decimal


class MonthlySeries(BaseModel):
    currency: Currency
    items: list[MonthlyPoint]


class CategoryBreakdownItem(BaseModel):
    category_id: uuid.UUID
    name: str
    color: str
    icon: str
    total: Decimal
    percentage: Decimal
    transaction_count: int


class CategoryBreakdown(BaseModel):
    currency: Currency
    type: TransactionType
    date_from: date
    date_to: date
    total: Decimal
    items: list[CategoryBreakdownItem]


class DailyPoint(BaseModel):
    date: date
    income: Decimal
    expense: Decimal
    net: Decimal


class DailySeries(BaseModel):
    currency: Currency
    month: str
    items: list[DailyPoint]
