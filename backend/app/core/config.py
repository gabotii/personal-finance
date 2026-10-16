from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from app.core.enums import Currency

INSECURE_SECRET_KEYS = {"", "change-this", "changeme", "secret"}


class Settings(BaseSettings):
    """Application settings, read from environment variables (and `.env` when present)."""

    model_config = SettingsConfigDict(
        # Later files win: backend/.env (local overrides) beats the root .env (Docker).
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Finanzas Personales API"
    app_env: Literal["development", "test", "production"] = "development"
    app_version: str = "1.0.0"

    database_url: str = "sqlite:///./dev.db"
    database_echo: bool = False

    # Dev-only placeholder; `_check_production_secrets` refuses it when APP_ENV=production.
    secret_key: str = "change-this"  # noqa: S105

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    default_currency: Currency = Currency.CLP
    default_timezone: str = "America/Santiago"

    session_cookie_name: str = "pf_session"
    session_ttl_hours: int = Field(default=24 * 7, ge=1, le=24 * 90)
    cookie_secure: bool | None = None

    rate_limit_enabled: bool = True
    login_rate_limit: int = Field(default=10, ge=1)
    login_rate_window_seconds: int = Field(default=60, ge=1)
    register_rate_limit: int = Field(default=5, ge=1)
    register_rate_window_seconds: int = Field(default=60, ge=1)

    enable_docs: bool | None = None
    log_level: str = "INFO"
    log_json: bool | None = None

    excel_max_rows: int = Field(default=50_000, ge=1)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        # Managed providers often hand out `postgres://` URLs; SQLAlchemy needs a driver name.
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value

    @model_validator(mode="after")
    def _check_production_secrets(self) -> Settings:
        if self.is_production:
            if self.secret_key in INSECURE_SECRET_KEYS or len(self.secret_key) < 32:
                raise ValueError(
                    "SECRET_KEY must be set to a random value of at least 32 characters "
                    "in production."
                )
            if self.database_url.startswith("sqlite"):
                raise ValueError("SQLite is not supported in production; use PostgreSQL.")
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def secure_cookies(self) -> bool:
        return self.cookie_secure if self.cookie_secure is not None else self.is_production

    @property
    def docs_enabled(self) -> bool:
        return self.enable_docs if self.enable_docs is not None else not self.is_production

    @property
    def json_logs(self) -> bool:
        return self.log_json if self.log_json is not None else self.is_production

    @property
    def session_ttl_seconds(self) -> int:
        return self.session_ttl_hours * 3600


@lru_cache
def get_settings() -> Settings:
    return Settings()
