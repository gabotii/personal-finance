#!/bin/sh
# Container entrypoint: wait for the database, apply migrations, then start the server.
set -eu

python -m app.db.wait_for_db --timeout "${DB_WAIT_TIMEOUT:-60}"
alembic upgrade head

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --proxy-headers \
  --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}" \
  --no-server-header \
  "$@"
