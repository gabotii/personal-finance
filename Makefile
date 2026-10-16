# Personal Finance — developer commands.
# Docker targets need Docker Compose v2. Local targets need Python 3.12+ and Node 20+.

COMPOSE      := docker compose
COMPOSE_DEV  := docker compose -f docker-compose.yml -f docker-compose.dev.yml

ifeq ($(OS),Windows_NT)
  VENV_BIN := .venv/Scripts
  PYTHON   ?= python
else
  VENV_BIN := .venv/bin
  PYTHON   ?= python3
endif
PY := $(VENV_BIN)/python

# Local (non-Docker) runs use SQLite unless DATABASE_URL is already set.
LOCAL_DB ?= sqlite:///./dev.db

.DEFAULT_GOAL := help
.PHONY: help install dev dev-local dev-backend dev-frontend up down logs ps test test-backend \
        test-frontend test-postgres lint format migrate migrate-local seed seed-local \
        backup restore clean clean-all

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install backend (venv) and frontend dependencies locally
	cd backend && $(PYTHON) -m venv .venv && $(PY) -m pip install -r requirements-dev.txt
	cd frontend && npm ci

# ---------------------------------------------------------------- Docker

dev: ## Docker dev stack with hot reload (http://localhost:5173)
	$(COMPOSE_DEV) up --build

up: ## Production-like Docker stack in background (http://localhost:8080)
	$(COMPOSE) up -d --build

down: ## Stop the Docker stack (data volume is kept)
	$(COMPOSE) down

logs: ## Follow logs of all services
	$(COMPOSE) logs -f --tail=100

ps: ## Show service status and health
	$(COMPOSE) ps

migrate: ## Apply migrations inside the running backend container
	$(COMPOSE) exec backend alembic upgrade head

seed: ## Load demo data inside the running backend container
	$(COMPOSE) exec backend python -m app.seed

backup: ## Dump the PostgreSQL database to backups/<timestamp>.sql.gz
	@mkdir -p backups
	$(COMPOSE) exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" --no-owner' | gzip > backups/backup-$$(date +%Y%m%d-%H%M%S).sql.gz
	@echo "Backup written to backups/"

restore: ## Restore a backup: make restore FILE=backups/backup-....sql.gz
	@test -n "$(FILE)" || (echo "Usage: make restore FILE=backups/<file>.sql.gz" && exit 1)
	gunzip -c $(FILE) | $(COMPOSE) exec -T db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# ----------------------------------------------------------------- Local

dev-local: ## Run backend + frontend locally without Docker (SQLite)
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	cd backend && DATABASE_URL=$${DATABASE_URL:-$(LOCAL_DB)} $(PY) -m alembic upgrade head && \
	DATABASE_URL=$${DATABASE_URL:-$(LOCAL_DB)} $(PY) -m uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

migrate-local: ## Apply migrations to the local database
	cd backend && DATABASE_URL=$${DATABASE_URL:-$(LOCAL_DB)} $(PY) -m alembic upgrade head

seed-local: ## Load demo data into the local database
	cd backend && DATABASE_URL=$${DATABASE_URL:-$(LOCAL_DB)} $(PY) -m app.seed

# --------------------------------------------------------------- Quality

test: test-backend test-frontend ## Run all tests

test-backend: ## Backend tests (SQLite)
	cd backend && $(PY) -m pytest

test-postgres: ## Backend tests against PostgreSQL: make test-postgres TEST_DATABASE_URL=postgresql+psycopg://...
	cd backend && TEST_DATABASE_URL=$(TEST_DATABASE_URL) $(PY) -m pytest

test-frontend: ## Frontend unit tests
	cd frontend && npm test

lint: ## Ruff, Black (check), mypy, ESLint, TypeScript, Prettier (check)
	cd backend && $(PY) -m ruff check app tests && $(PY) -m black --check app tests && $(PY) -m mypy app tests
	cd frontend && npm run lint && npm run typecheck && npm run format:check

format: ## Auto-format backend and frontend
	cd backend && $(PY) -m ruff check --fix app tests && $(PY) -m black app tests
	cd frontend && npm run format

clean: ## Remove caches and build artifacts (keeps databases and Docker volumes)
	rm -rf backend/.pytest_cache backend/.mypy_cache backend/.ruff_cache backend/htmlcov backend/.coverage
	find backend -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf frontend/dist frontend/coverage frontend/node_modules/.tmp frontend/node_modules/.vite

clean-all: clean ## Also delete the local SQLite DB and the Docker volume (DESTROYS DATA)
	rm -f backend/dev.db
	$(COMPOSE) down -v
