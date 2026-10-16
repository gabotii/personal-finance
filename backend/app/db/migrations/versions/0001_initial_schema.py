"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-05 17:53:18.509114+00:00

Hand-reviewed: portable defaults (now(), true) and enum CHECK constraints named with
the same convention as the models (ck_<table>_<enum name>), valid on PostgreSQL and SQLite.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:  # type: ignore[type-arg]
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("theme", sa.String(length=6), nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "currency IN ('CLP', 'USD', 'EUR')", name=op.f("ck_users_currency")
        ),
        sa.CheckConstraint(
            "theme IN ('LIGHT', 'DARK', 'SYSTEM')", name=op.f("ck_users_theme_preference")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )

    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("type", sa.String(length=7), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("icon", sa.String(length=40), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "type IN ('INCOME', 'EXPENSE')", name=op.f("ck_categories_transaction_type")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_categories_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
        sa.UniqueConstraint(
            "user_id", "type", "name", name=op.f("uq_categories_user_id_type_name")
        ),
    )
    op.create_index("ix_categories_user_id_type", "categories", ["user_id", "type"])

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_user_sessions_token_hash")),
    )
    op.create_index(op.f("ix_user_sessions_expires_at"), "user_sessions", ["expires_at"])
    op.create_index(op.f("ix_user_sessions_user_id"), "user_sessions", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=7), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "type IN ('INCOME', 'EXPENSE')", name=op.f("ck_transactions_transaction_type")
        ),
        sa.CheckConstraint("amount > 0", name=op.f("ck_transactions_amount_positive")),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name=op.f("fk_transactions_category_id_categories"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_transactions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transactions")),
    )
    op.create_index(op.f("ix_transactions_category_id"), "transactions", ["category_id"])
    op.create_index(
        "ix_transactions_user_id_transaction_date",
        "transactions",
        ["user_id", "transaction_date"],
    )
    op.create_index(
        "ix_transactions_user_id_type_transaction_date",
        "transactions",
        ["user_id", "type", "transaction_date"],
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_user_id_type_transaction_date", table_name="transactions")
    op.drop_index("ix_transactions_user_id_transaction_date", table_name="transactions")
    op.drop_index(op.f("ix_transactions_category_id"), table_name="transactions")
    op.drop_table("transactions")
    op.drop_index(op.f("ix_user_sessions_user_id"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_expires_at"), table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index("ix_categories_user_id_type", table_name="categories")
    op.drop_table("categories")
    op.drop_table("users")
