from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import TransactionType
from app.core.errors import ValidationError
from app.core.money import ZERO, percent_change, percentage, to_money
from app.models.user import User
from app.repositories.transaction_repository import TransactionRepository, TypeTotals
from app.schemas.dashboard import (
    CategoryBreakdown,
    CategoryBreakdownItem,
    DailyPoint,
    DailySeries,
    DashboardSummary,
    MetricComparison,
    MonthComparison,
    MonthlyPoint,
    MonthlySeries,
    PeriodSummary,
    PeriodTotals,
)
from app.utils.dates import format_month, month_bounds, parse_month, shift_month, today_in

MAX_MONTHS = 24


def _period_totals(totals: TypeTotals) -> PeriodTotals:
    return PeriodTotals(
        income=totals.income,
        expense=totals.expense,
        net=totals.net,
        savings_rate=savings_rate(totals.income, totals.expense),
        transaction_count=totals.count,
    )


def savings_rate(income: Decimal, expense: Decimal) -> Decimal | None:
    """((income - expense) / income) * 100. Undefined (None) when there is no income."""
    return percentage(income - expense, income)


def _compare(current: Decimal, previous: Decimal) -> MetricComparison:
    return MetricComparison(
        current=current,
        previous=previous,
        difference=current - previous,
        difference_pct=percent_change(current, previous),
    )


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.transactions = TransactionRepository(db)

    def _resolve_month(self, user: User, month: str | None) -> tuple[int, int]:
        if month is None:
            today = today_in(user.timezone)
            return today.year, today.month
        try:
            return parse_month(month)
        except ValueError as exc:
            raise ValidationError(details={"fields": {"month": str(exc)}}) from exc

    def summary(self, user: User, month: str | None = None) -> DashboardSummary:
        year, mon = self._resolve_month(user, month)
        start, end = month_bounds(year, mon)
        prev_start, prev_end = month_bounds(*shift_month(year, mon, -1))

        current = self.transactions.totals_by_type(user.id, date_from=start, date_to=end)
        previous = self.transactions.totals_by_type(user.id, date_from=prev_start, date_to=prev_end)
        balance = self.transactions.totals_by_type(user.id, date_to=end).net
        previous_balance = balance - current.net

        return DashboardSummary(
            month=format_month(year, mon),
            currency=user.currency,
            balance=balance,
            previous_balance=previous_balance,
            balance_change_pct=percent_change(balance, previous_balance),
            current=_period_totals(current),
            previous=_period_totals(previous),
            comparison=MonthComparison(
                income=_compare(current.income, previous.income),
                expense=_compare(current.expense, previous.expense),
                net=_compare(current.net, previous.net),
            ),
        )

    def monthly(self, user: User, months: int = 6, end_month: str | None = None) -> MonthlySeries:
        if not 1 <= months <= MAX_MONTHS:
            raise ValidationError(
                details={"fields": {"months": f"Debe estar entre 1 y {MAX_MONTHS}."}}
            )
        end_year, end_mon = self._resolve_month(user, end_month)
        start_year, start_mon = shift_month(end_year, end_mon, -(months - 1))
        range_start, _ = month_bounds(start_year, start_mon)
        _, range_end = month_bounds(end_year, end_mon)

        opening = self.transactions.totals_by_type(
            user.id, date_to=range_start - timedelta(days=1)
        ).net
        totals = self.transactions.monthly_totals(user.id, range_start, range_end)

        items: list[MonthlyPoint] = []
        running = opening
        for offset in range(months):
            y, m = shift_month(start_year, start_mon, offset)
            month_totals = totals.get((y, m), {})
            income = month_totals.get(TransactionType.INCOME, ZERO)
            expense = month_totals.get(TransactionType.EXPENSE, ZERO)
            running += income - expense
            items.append(
                MonthlyPoint(
                    month=format_month(y, m),
                    income=income,
                    expense=expense,
                    net=income - expense,
                    balance=running,
                )
            )
        return MonthlySeries(currency=user.currency, items=items)

    def _resolve_range(
        self, user: User, date_from: date | None, date_to: date | None
    ) -> tuple[date, date]:
        """Missing bounds default to the user's current month."""
        if date_from is None or date_to is None:
            today = today_in(user.timezone)
            default_from, default_to = month_bounds(today.year, today.month)
            date_from = date_from or default_from
            date_to = date_to or default_to
        if date_from > date_to:
            raise ValidationError(
                details={
                    "fields": {"date_to": "La fecha hasta debe ser posterior a la fecha desde."}
                }
            )
        return date_from, date_to

    def period(
        self, user: User, *, date_from: date | None = None, date_to: date | None = None
    ) -> PeriodSummary:
        """Totals for an arbitrary date range."""
        date_from, date_to = self._resolve_range(user, date_from, date_to)
        totals = self.transactions.totals_by_type(user.id, date_from=date_from, date_to=date_to)
        return PeriodSummary(
            currency=user.currency,
            date_from=date_from,
            date_to=date_to,
            totals=_period_totals(totals),
        )

    def categories(
        self,
        user: User,
        *,
        type_: TransactionType = TransactionType.EXPENSE,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> CategoryBreakdown:
        date_from, date_to = self._resolve_range(user, date_from, date_to)
        rows = self.transactions.category_totals(
            user.id, type_=type_, date_from=date_from, date_to=date_to
        )
        total = to_money(sum((row.total for _, row in rows), ZERO))
        items = [
            CategoryBreakdownItem(
                category_id=row.category_id,
                name=row.name,
                color=row.color,
                icon=row.icon,
                total=row.total,
                percentage=percentage(row.total, total) or ZERO,
                transaction_count=row.count,
            )
            for _, row in rows
        ]
        return CategoryBreakdown(
            currency=user.currency,
            type=type_,
            date_from=date_from,
            date_to=date_to,
            total=total,
            items=items,
        )

    def daily(self, user: User, month: str | None = None) -> DailySeries:
        year, mon = self._resolve_month(user, month)
        start, end = month_bounds(year, mon)
        totals = self.transactions.daily_totals(user.id, start, end)

        items: list[DailyPoint] = []
        day = start
        while day <= end:
            day_totals = totals.get(day, {})
            income = day_totals.get(TransactionType.INCOME, ZERO)
            expense = day_totals.get(TransactionType.EXPENSE, ZERO)
            items.append(DailyPoint(date=day, income=income, expense=expense, net=income - expense))
            day += timedelta(days=1)
        return DailySeries(currency=user.currency, month=format_month(year, mon), items=items)
