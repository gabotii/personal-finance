"""Structured logging.

Production emits one JSON object per line; development emits readable key=value lines.
Records never include request bodies, headers, cookies or tokens: callers pass only
explicit, non-sensitive fields through `extra`.
"""

from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

_RESERVED_ATTRS = frozenset(vars(logging.makeLogRecord({})).keys()) | {"message", "asctime"}
_SENSITIVE_KEYS = frozenset(
    {
        "password",
        "new_password",
        "current_password",
        "token",
        "cookie",
        "authorization",
        "secret",
        "password_hash",
        "session",
    }
)


def _extra_fields(record: logging.LogRecord) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    for key, value in record.__dict__.items():
        if key in _RESERVED_ATTRS or key.startswith("_"):
            continue
        fields[key] = "[REDACTED]" if key.lower() in _SENSITIVE_KEYS else value
    return fields


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }
        request_id = request_id_var.get()
        if request_id:
            payload["request_id"] = request_id
        payload.update(_extra_fields(record))
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


class ConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, UTC).astimezone().strftime("%H:%M:%S")
        parts = [f"{timestamp} {record.levelname:<7} {record.name}: {record.getMessage()}"]
        request_id = request_id_var.get()
        if request_id:
            parts.append(f"request_id={request_id}")
        parts.extend(f"{key}={value}" for key, value in _extra_fields(record).items())
        line = " ".join(parts)
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


def configure_logging(level: str = "INFO", json_logs: bool = False) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if json_logs else ConsoleFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # Uvicorn's access log duplicates our request log and includes query strings.
    logging.getLogger("uvicorn.access").disabled = True
    for name in ("uvicorn", "uvicorn.error"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers.clear()
        uvicorn_logger.propagate = True
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
