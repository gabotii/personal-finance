"""Block until the database accepts connections.

Used by the container entrypoint: a running PostgreSQL process is not the same as a
database that is ready to accept queries, so we actively retry `SELECT 1`.

Usage: python -m app.db.wait_for_db [--timeout SECONDS]
"""

from __future__ import annotations

import argparse
import logging
import sys
import time

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.database import engine

logger = logging.getLogger("app.wait_for_db")


def wait_for_database(timeout_seconds: float = 60.0) -> bool:
    deadline = time.monotonic() + timeout_seconds
    delay = 0.5
    attempt = 0
    while True:
        attempt += 1
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("database_ready", extra={"attempts": attempt})
            return True
        except OperationalError as exc:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                logger.error(
                    "database_unavailable",
                    extra={"attempts": attempt, "error": type(exc.orig).__name__},
                )
                return False
            logger.info("waiting_for_database", extra={"attempt": attempt})
            time.sleep(min(delay, remaining))
            delay = min(delay * 2, 5.0)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=float, default=60.0)
    args = parser.parse_args()
    settings = get_settings()
    configure_logging(settings.log_level, settings.json_logs)
    sys.exit(0 if wait_for_database(args.timeout) else 1)


if __name__ == "__main__":
    main()
