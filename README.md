# Finanzas Personales

Aplicación web para controlar ingresos y gastos personales: movimientos con filtros y
paginación, categorías, dashboard con métricas y gráficos, reportes por período, exportación a
CSV y Excel, modo oscuro y diseño responsive.

- **Backend:** Python 3.12 · FastAPI · SQLAlchemy 2 · Pydantic v2 · Alembic · PostgreSQL
- **Frontend:** React 19 · TypeScript · Vite · Tailwind CSS · componentes estilo shadcn/ui
  (Radix) · TanStack Query · React Hook Form + Zod · Recharts
- **Infraestructura:** Docker · Docker Compose · nginx

Las decisiones de arquitectura están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Contenido

1. [Requisitos](#requisitos)
2. [Inicio rápido con Docker](#inicio-rápido-con-docker)
3. [Desarrollo](#desarrollo)
4. [Migraciones](#migraciones)
5. [Datos de demostración](#datos-de-demostración)
6. [Tests y calidad](#tests-y-calidad)
7. [Variables de entorno](#variables-de-entorno)
8. [API](#api)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Seguridad](#seguridad)
11. [Deployment](#deployment)
12. [Backups](#backups)
13. [Solución de problemas](#solución-de-problemas)

---

## Requisitos

| Uso | Necesitas |
|---|---|
| Docker (recomendado) | Docker Engine 24+ con Docker Compose v2.24+ |
| Desarrollo local | Python 3.12+ · Node.js 20+ (probado con 24) · npm |
| `make` (opcional) | GNU Make. En Windows: Git Bash/WSL, o ejecuta los comandos equivalentes indicados en cada sección |

## Inicio rápido con Docker

```bash
cp .env.example .env          # revisa SECRET_KEY y POSTGRES_PASSWORD
docker compose up -d --build  # o: make up
docker compose exec backend python -m app.seed   # o: make seed (datos demo)
```

- Aplicación: <http://localhost:8080>
- API docs (Swagger): <http://localhost:8000/docs>
- Usuario demo: `demo@finanzas.app` / `Demo1234`

`docker compose up` levanta tres servicios encadenados por healthchecks:

1. **db** — PostgreSQL 16 con volumen persistente `pgdata`; healthcheck `pg_isready`.
2. **backend** — espera activamente a que PostgreSQL acepte consultas
   (`python -m app.db.wait_for_db`), aplica migraciones (`alembic upgrade head`) y arranca
   uvicorn. Healthcheck sobre `/health`.
3. **frontend** — nginx sirve la SPA compilada y hace proxy de `/api` y `/health` al backend
   (mismo origen: la cookie de sesión funciona sin CORS).

```bash
docker compose ps        # estado y salud de los servicios (make ps)
docker compose logs -f   # logs (make logs)
docker compose down      # detener; los datos se conservan (make down)
```

## Desarrollo

### Con Docker (hot reload)

```bash
make dev
# equivalente: docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend con HMR: <http://localhost:5173> (Vite hace proxy de `/api` al backend)
- Backend con `--reload`: <http://localhost:8000/docs>
- PostgreSQL expuesto en `localhost:5432`

### Sin Docker (SQLite)

Para desarrollo rápido se puede usar SQLite. PostgreSQL sigue siendo la base de datos de
producción.

```bash
make install       # crea backend/.venv e instala dependencias; npm ci en frontend
make migrate-local # alembic upgrade head sobre backend/dev.db
make seed-local    # datos demo
make dev-local     # backend :8000 + frontend :5173 en paralelo
```

Equivalente manual (por ejemplo en PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
$env:DATABASE_URL = "sqlite:///./dev.db"
.venv\Scripts\alembic upgrade head
.venv\Scripts\python -m app.seed
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# en otra terminal
cd frontend
npm ci
npm run dev
```

> La configuración se lee de variables de entorno, luego de `backend/.env` y luego de `.env`
> en la raíz (el archivo de `backend/` tiene prioridad). Para desarrollo local sin Docker crea
> `backend/.env` con `DATABASE_URL=sqlite:///./dev.db`.

## Migraciones

Las migraciones viven en `backend/app/db/migrations/versions/`. Son portables entre PostgreSQL y
SQLite y un test verifica que coincidan exactamente con los modelos.

```bash
make migrate                                   # dentro del contenedor
cd backend && alembic upgrade head             # local
cd backend && alembic revision --autogenerate -m "descripción"   # nueva migración
cd backend && alembic check                    # falla si modelos y migraciones difieren
```

Revisa siempre la migración autogenerada antes de confirmarla.

## Datos de demostración

```bash
python -m app.seed           # crea el usuario demo si no existe (idempotente)
python -m app.seed --reset   # lo elimina y lo vuelve a crear
python -m app.seed --months 6
```

Crea `demo@finanzas.app` / `Demo1234`, las categorías por defecto y unos 12 meses de movimientos
realistas y deterministas. Se niega a ejecutarse con `APP_ENV=production`.

## Tests y calidad

```bash
make test     # backend (pytest) + frontend (vitest)
make lint     # ruff, black --check, mypy (strict), eslint, tsc, prettier --check
make format   # ruff --fix, black, prettier
```

| Suite | Qué cubre |
|---|---|
| `backend/tests/test_auth.py` | registro, login, contraseña inválida, endpoints sin sesión, logout con revocación real, rate limiting, cambio de contraseña, preferencias |
| `backend/tests/test_transactions.py` | CRUD, validación de montos y decimales por moneda, filtros individuales y combinados, búsqueda con comodines, orden, paginación |
| `backend/tests/test_security.py` | aislamiento entre usuarios (IDOR) en lectura, edición, borrado, listados, agregados, exportaciones y categorías; CSRF por `Origin`; cabeceras; CORS |
| `backend/tests/test_categories.py` | CRUD, duplicados, activar/desactivar, borrado con reasignación |
| `backend/tests/test_dashboard.py` | totales mensuales, balance acumulado, tasa de ahorro (incluido ingresos = 0), comparación mensual, series y período |
| `backend/tests/test_exports.py` | CSV válido (BOM, streaming, filtros, inyección de fórmulas) y Excel válido (hojas, formatos, totales, filtros, límite) |
| `backend/tests/test_core.py` | dinero, fechas, rate limiter, health, **migraciones = modelos**, seed |
| `frontend/src/**/*.test.ts(x)` | parseo y formato de montos, fechas, cliente API (envelope, errores, 401, red), componentes accesibles |

Por defecto los tests del backend usan SQLite. Para correrlos contra PostgreSQL:

```bash
make test-postgres TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/pf_test
```

El workflow de CI (`.github/workflows/ci.yml`) ejecuta lint, tests en SQLite **y** PostgreSQL,
verifica migraciones, compila el frontend y levanta el stack completo con Docker Compose.

## Variables de entorno

Todas se documentan en [`.env.example`](.env.example).

| Variable | Por defecto | Descripción |
|---|---|---|
| `APP_ENV` | `development` | `development`, `test` o `production`. En producción se exige `SECRET_KEY` fuerte y PostgreSQL |
| `DATABASE_URL` | `sqlite:///./dev.db` | URL SQLAlchemy. PostgreSQL: `postgresql+psycopg://user:pass@host:5432/db` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | — | Credenciales del contenedor `db` |
| `SECRET_KEY` | `change-this` | Clave HMAC de los tokens de sesión. Cambiarla cierra todas las sesiones |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes permitidos, separados por coma |
| `DEFAULT_CURRENCY` | `CLP` | Moneda inicial de usuarios nuevos (`CLP`, `USD`, `EUR`) |
| `DEFAULT_TIMEZONE` | `America/Santiago` | Zona horaria inicial (el frontend envía la del navegador al registrarse) |
| `COOKIE_SECURE` | `true` en producción | Cookie solo por HTTPS |
| `SESSION_TTL_HOURS` | `168` | Duración de la sesión (renovación deslizante) |
| `ENABLE_DOCS` | `true` salvo producción | Expone `/docs`, `/redoc` y `/openapi.json` |
| `RATE_LIMIT_ENABLED` | `true` | Límite de intentos en login/registro |
| `LOGIN_RATE_LIMIT` / `LOGIN_RATE_WINDOW_SECONDS` | `10` / `60` | Intentos de login por IP y ventana |
| `REGISTER_RATE_LIMIT` / `REGISTER_RATE_WINDOW_SECONDS` | `5` / `60` | Registros por IP y ventana |
| `EXCEL_MAX_ROWS` | `50000` | Máximo de filas por exportación Excel (CSV no tiene límite) |
| `LOG_LEVEL` / `LOG_JSON` | `INFO` / `true` en producción | Nivel y formato de logs |
| `WEB_CONCURRENCY` | `2` | Workers de uvicorn en el contenedor |

## API

Documentación interactiva en `/docs` (Swagger) y `/redoc`.

**Formato de respuesta**

```json
{ "data": { "...": "..." }, "message": "Movimiento creado" }
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": { "fields": { "amount": "El monto debe ser mayor a 0." } }
  }
}
```

`DELETE` responde `204 No Content`. Los montos son strings decimales (`"25000.00"`), siempre
positivos; el signo lo determina `type` (`INCOME` / `EXPENSE`).

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Crea la cuenta, sus categorías y la sesión |
| `POST` | `/api/v1/auth/login` | Inicia sesión (cookie HttpOnly) |
| `POST` | `/api/v1/auth/logout` | Revoca la sesión |
| `GET` | `/api/v1/auth/me` | Usuario actual |
| `GET`/`PATCH` | `/api/v1/users/me` | Perfil y preferencias (moneda, zona horaria, tema) |
| `POST` | `/api/v1/users/me/password` | Cambio de contraseña (cierra otras sesiones) |
| `GET` | `/api/v1/transactions` | Listado con filtros y paginación |
| `POST` | `/api/v1/transactions` | Crear |
| `GET` | `/api/v1/transactions/{id}` | Detalle |
| `PATCH` | `/api/v1/transactions/{id}` | Editar (parcial) |
| `DELETE` | `/api/v1/transactions/{id}` | Eliminar |
| `GET` | `/api/v1/categories` | Listar (incluye `transaction_count`) |
| `POST` | `/api/v1/categories` | Crear |
| `PATCH` | `/api/v1/categories/{id}` | Editar / activar / desactivar |
| `DELETE` | `/api/v1/categories/{id}?reassign_to=` | Eliminar; si tiene movimientos exige reasignarlos |
| `GET` | `/api/v1/dashboard/summary?month=AAAA-MM` | Balance, mes, tasa de ahorro, comparación |
| `GET` | `/api/v1/dashboard/monthly?months=6&end_month=` | Evolución mensual |
| `GET` | `/api/v1/dashboard/period?date_from=&date_to=` | Totales de un rango de fechas |
| `GET` | `/api/v1/dashboard/categories?type=&date_from=&date_to=` | Totales por categoría |
| `GET` | `/api/v1/dashboard/daily?month=` | Ingresos y gastos por día |
| `GET` | `/api/v1/export/csv` | CSV (streaming) con los filtros del listado |
| `GET` | `/api/v1/export/excel` | Excel: Movimientos, Resumen, Categorías |
| `GET` | `/health` | Estado de la app y la base de datos |

**Filtros** (`/transactions` y `/export/*`, combinables): `date_from`, `date_to`, `type`,
`category_id`, `q` (descripción, notas y categoría), `min_amount`, `max_amount`.
**Paginación:** `page`, `page_size` ∈ {10, 25, 50, 100}, `sort` ∈ {`date_desc`, `date_asc`,
`amount_desc`, `amount_asc`}. Respuesta: `{items, total, page, page_size, total_pages}`.

Ejemplo con `curl`:

```bash
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"demo@finanzas.app","password":"Demo1234"}' \
  http://localhost:8000/api/v1/auth/login

curl -b cookies.txt "http://localhost:8000/api/v1/transactions?type=EXPENSE&page_size=10"
curl -b cookies.txt -o movimientos.xlsx "http://localhost:8000/api/v1/export/excel?date_from=2026-01-01"
```

## Estructura del proyecto

```
personal-finance/
├── backend/
│   ├── app/
│   │   ├── main.py            # create_app(): middlewares, errores, routers
│   │   ├── seed.py            # datos de demostración
│   │   ├── api/               # deps (sesión, usuario actual) y routes/ (HTTP)
│   │   ├── core/              # config, seguridad, errores, logging, middlewares, dinero
│   │   ├── db/                # engine, base declarativa, wait_for_db, migraciones Alembic
│   │   ├── models/            # User, UserSession, Category, Transaction
│   │   ├── schemas/           # contratos Pydantic de entrada/salida
│   │   ├── repositories/      # consultas, siempre filtradas por user_id
│   │   ├── services/          # reglas de negocio y cálculos financieros
│   │   └── utils/             # fechas, seguridad de hojas de cálculo
│   ├── tests/
│   ├── Dockerfile / Dockerfile.dev
│   └── pyproject.toml         # ruff, black, mypy, pytest
├── frontend/
│   ├── src/
│   │   ├── components/        # UI reutilizable (ui/ = primitivas estilo shadcn)
│   │   ├── features/          # auth, transactions, categories, dashboard, charts, exports, theme
│   │   ├── layouts/           # AppLayout (sidebar + header), AuthLayout
│   │   ├── pages/             # una por ruta (code-splitting)
│   │   ├── services/api/      # único punto que usa fetch()
│   │   ├── lib/               # formato, dinero, fechas, query client
│   │   └── types/             # contrato de la API
│   ├── nginx/                 # configuración de producción
│   └── Dockerfile
├── docs/ARCHITECTURE.md
├── docker-compose.yml / docker-compose.dev.yml
├── .env.example
└── Makefile
```

## Seguridad

- **Sesiones en servidor** con cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` en producción).
  Solo se guarda el HMAC-SHA256 del token; logout y cambio de contraseña revocan de verdad.
- **Contraseñas** con Argon2id; el login no revela si un email existe (tiempo constante).
- **Aislamiento entre usuarios:** todas las consultas filtran por `user_id` en la capa de
  repositorio; un recurso ajeno responde igual que uno inexistente (`404`). Cubierto por tests.
- **CSRF:** `SameSite=Lax`, ningún `GET` modifica estado y verificación de `Origin` en métodos
  que modifican datos.
- **Rate limiting** de login y registro por IP (en memoria por proceso; ver Deployment).
- **Cabeceras:** CSP estricta, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS en producción.
- **Exportaciones** protegidas contra inyección de fórmulas en CSV y Excel.
- **Errores** con formato uniforme y sin stack traces; los logs no incluyen contraseñas, tokens ni
  cookies, y cada respuesta lleva `X-Request-ID` para correlacionar.

## Deployment

Checklist para producción:

1. `APP_ENV=production`, `SECRET_KEY` aleatoria de 32+ caracteres y `POSTGRES_PASSWORD` fuerte.
2. Servir detrás de HTTPS (balanceador o proxy con TLS) y `COOKIE_SECURE=true`.
3. `CORS_ORIGINS` con el dominio real; `ENABLE_DOCS=false` si la API no debe ser pública.
4. No publicar el puerto del backend: quita `ports` del servicio `backend` en
   `docker-compose.yml` (solo nginx debe recibir tráfico).
5. Si hay otro proxy delante de nginx, configúralo para **sobrescribir** `X-Forwarded-For`
   con la IP real del cliente.
6. El rate limiting es en memoria por worker: con varios workers o réplicas el límite efectivo se
   multiplica. Para escalar horizontalmente, reemplaza `SlidingWindowRateLimiter`
   (`backend/app/core/rate_limit.py`) por una implementación con Redis.
7. Programa backups (ver abajo) y monitorea `/health`.

Las imágenes son multi-stage, se ejecutan como usuario no root y el backend aplica las
migraciones al arrancar, después de esperar a la base de datos.

## Backups

```bash
make backup                                   # backups/backup-AAAAMMDD-HHMMSS.sql.gz
make restore FILE=backups/backup-....sql.gz   # restaura sobre la base actual
```

Recomendado: backup diario programado (cron) con retención (p. ej. 7 diarios + 4 semanales),
copiado fuera del servidor, y una prueba de restauración periódica.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| El backend no arranca y menciona `SECRET_KEY` | `APP_ENV=production` con una clave débil: genera una nueva |
| `403 FORBIDDEN_ORIGIN` | El origen del navegador no está en `CORS_ORIGINS` |
| Sesión que se pierde al recargar en HTTP | `COOKIE_SECURE=true` sin HTTPS |
| `422` al guardar un monto en CLP con decimales | CLP no admite decimales; usa USD/EUR o un monto entero |
| `409 CATEGORY_IN_USE` | La categoría tiene movimientos: reasígnalos o desactívala |
