# Arquitectura — Finanzas Personales

Documento de la Fase 0 (Discovery). Describe las decisiones técnicas del proyecto y su justificación.
Si una decisión cambia, este documento se actualiza en el mismo commit.

## 1. Arquitectura

```
Navegador (React SPA)
   │  HTTPS, cookie de sesión HttpOnly (same-origin)
   ▼
nginx (contenedor frontend) ── sirve estáticos ── /api/* y /health → proxy
   ▼
FastAPI (contenedor backend)
   ├── api/routes      → HTTP: parseo, status codes, envelope de respuesta
   ├── services        → reglas de negocio, ownership, cálculos financieros
   ├── repositories    → consultas SQLAlchemy, siempre filtradas por user_id
   └── models          → ORM (SQLAlchemy 2.x)
   ▼
PostgreSQL 16 (volumen persistente)
```

Reglas de capas:

- Las rutas nunca ejecutan consultas; llaman a servicios.
- Los servicios nunca construyen respuestas HTTP; lanzan errores de dominio (`AppError`) que un
  handler global traduce al formato `{"error": {...}}`.
- Los repositorios reciben `user_id` en **todas** las operaciones sobre recursos del usuario. No
  existe un método "obtener por id" sin `user_id`: así se previene IDOR por construcción.

Frontend y API se sirven desde el **mismo origen** (nginx en producción, proxy de Vite en
desarrollo). Esto permite cookies `SameSite=Lax` sin CORS en el camino normal; CORS queda
configurado solo para orígenes explícitos.

## 2. Stack definitivo

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12 (imagen Docker), FastAPI, SQLAlchemy 2.x (sync), Pydantic v2, pydantic-settings, Alembic |
| Base de datos | PostgreSQL 16 (producción y Docker), SQLite (desarrollo rápido y tests) |
| Driver | psycopg 3 |
| Hashing | Argon2id (argon2-cffi) |
| Excel | openpyxl |
| Calidad backend | pytest, httpx (TestClient), Ruff, Black, mypy (strict) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 3, componentes estilo shadcn/ui sobre Radix UI, Lucide, TanStack Query v5, React Router, React Hook Form + Zod, Recharts, Sonner (toasts) |
| Calidad frontend | ESLint (flat config), `tsc`, Vitest |
| Infra | Docker, Docker Compose, nginx |

Por qué SQLAlchemy **sync**: FastAPI ejecuta los endpoints `def` en un threadpool, la carga
esperada es baja y el código sync es más simple de testear y depurar. Migrar a async sería un
cambio local a `db/` y repositorios si alguna vez hace falta.

Por qué componentes "estilo shadcn/ui" escritos en el repo: shadcn/ui no es una dependencia, es
código que se copia al proyecto. Se escriben directamente en `src/components/ui` con las mismas
primitivas (Radix + `class-variance-authority` + `tailwind-merge`).

## 3. Estructura de carpetas

```
personal-finance/
├── backend/
│   ├── app/
│   │   ├── main.py                 # create_app(): middlewares, handlers, routers
│   │   ├── seed.py                 # python -m app.seed
│   │   ├── api/
│   │   │   ├── deps.py             # get_db, get_current_user
│   │   │   ├── router.py           # agrega routers bajo /api/v1
│   │   │   └── routes/             # auth, users, transactions, categories, dashboard, exports, health
│   │   ├── core/
│   │   │   ├── config.py           # Settings (env vars)
│   │   │   ├── security.py         # Argon2, tokens de sesión, cookies
│   │   │   ├── logging.py          # logging estructurado (JSON en producción)
│   │   │   ├── errors.py           # AppError + handlers → {"error": {...}}
│   │   │   ├── middleware.py       # request id, access log, security headers, origin check
│   │   │   ├── rate_limit.py       # sliding window en memoria
│   │   │   ├── enums.py            # TransactionType, Currency, ThemePreference
│   │   │   └── money.py            # Decimal: cuantización, reglas por moneda
│   │   ├── db/
│   │   │   ├── base.py             # DeclarativeBase + mixins (UUID, timestamps)
│   │   │   ├── database.py         # engine, SessionLocal
│   │   │   ├── wait_for_db.py      # espera activa a PostgreSQL
│   │   │   └── migrations/         # Alembic
│   │   ├── models/                 # user, user_session, category, transaction
│   │   ├── schemas/                # Pydantic v2 (request/response)
│   │   ├── repositories/           # acceso a datos
│   │   ├── services/               # lógica de negocio
│   │   └── utils/                  # fechas, CSV seguro
│   ├── tests/
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── requirements.txt / requirements-dev.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/ui/          # Button, Input, Select, Dialog, Card, Badge, Skeleton…
│   │   ├── components/             # DataTable, Pagination, EmptyState, ChartCard, CurrencyDisplay…
│   │   ├── features/               # auth, transactions, categories, dashboard, reports, settings
│   │   ├── hooks/
│   │   ├── layouts/                # AppLayout (sidebar + header), AuthLayout
│   │   ├── lib/                    # formato, utilidades, query client
│   │   ├── pages/
│   │   ├── services/api/           # ÚNICO lugar con fetch()
│   │   └── types/
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml              # producción-like: db, backend, frontend
├── docker-compose.dev.yml          # override con hot reload
├── .env.example
├── Makefile
└── README.md
```

## 4. Modelo de datos

Todos los IDs son UUID v4. Todas las tablas tienen `created_at` / `updated_at` (UTC, timezone-aware).

### users
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| name | varchar(100) | |
| email | varchar(254) | único, normalizado a minúsculas |
| password_hash | varchar(255) | Argon2id |
| currency | enum `CLP`/`USD`/`EUR` | default `CLP` |
| timezone | varchar(64) | IANA, default `America/Santiago` |
| theme | enum `LIGHT`/`DARK`/`SYSTEM` | preferencia de tema |

### user_sessions
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users (CASCADE) | índice |
| token_hash | char(64) | HMAC-SHA256 del token con `SECRET_KEY`; único. El token en claro solo vive en la cookie |
| expires_at | timestamptz | índice |
| last_used_at | timestamptz | |

### categories
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users (CASCADE) | |
| name | varchar(50) | |
| type | enum `INCOME`/`EXPENSE` | |
| color | char(7) | hex `#RRGGBB` |
| icon | varchar(40) | nombre de un set cerrado de íconos Lucide |
| is_active | bool | inactivas no aparecen en formularios de creación |

Restricciones: `UNIQUE(user_id, type, name)`, índice `(user_id, type)`.
Unicidad case-insensitive verificada además en el servicio.

### transactions
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users (CASCADE) | |
| category_id | UUID FK → categories (NO ACTION) | impide borrar categorías en uso; se verifica al final de la sentencia para que el borrado en cascada de un usuario funcione |
| type | enum `INCOME`/`EXPENSE` | debe coincidir con `category.type` |
| amount | NUMERIC(14,2) | siempre > 0; el signo lo da `type` |
| description | varchar(200) | |
| notes | text nullable | máx. 2000 caracteres |
| transaction_date | date | fecha local del usuario, sin hora |

Índices: `(user_id, transaction_date)`, `(user_id, type, transaction_date)`, `(category_id)`.
`CHECK (amount > 0)`.

### Reglas financieras

- Dinero = `Decimal` en todo el backend, `NUMERIC(14,2)` en PostgreSQL, **string** en JSON
  (`"125000.00"`). Nunca `float`.
- Montos siempre positivos; ingresos y gastos se distinguen por `type`.
- Decimales permitidos según la moneda del usuario: CLP 0, USD/EUR 2. Un monto `1500.50` en CLP
  se rechaza con `VALIDATION_ERROR`.
- Cambiar la moneda es un cambio de **presentación** (no hay conversión). No se permite pasar a una
  moneda sin decimales si existen montos con centavos.
- Todos los totales, balances y porcentajes se calculan en el backend. El frontend solo formatea.
- Tasa de ahorro = `(ingresos − gastos) / ingresos × 100`; `null` cuando ingresos = 0
  (el frontend muestra "—" con explicación).
- Variación porcentual = `null` cuando el valor base es 0.
- "Mes actual" se calcula en la zona horaria del usuario.

## 5. API principal

Prefijo `/api/v1`. Respuestas exitosas: `{"data": ..., "message": "..."}`. Errores:
`{"error": {"code", "message", "details"}}`. `DELETE` responde `204` sin cuerpo.

| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/register | crea usuario + categorías por defecto + sesión |
| POST | /auth/login | crea sesión (cookie) |
| POST | /auth/logout | revoca sesión |
| GET | /auth/me | usuario actual |
| GET / PATCH | /users/me | perfil; nombre, moneda, zona horaria, tema |
| POST | /users/me/password | cambio de contraseña (revoca otras sesiones) |
| GET | /transactions | filtros + paginación server-side |
| POST | /transactions | crear |
| GET | /transactions/{id} | detalle |
| PATCH | /transactions/{id} | editar |
| DELETE | /transactions/{id} | eliminar |
| GET | /categories | listar (con conteo de movimientos) |
| POST | /categories | crear |
| PATCH | /categories/{id} | editar / activar / desactivar |
| DELETE | /categories/{id}?reassign_to= | eliminar; si tiene movimientos exige reasignación |
| GET | /dashboard/summary?month= | balance, mes, tasa de ahorro, comparación con mes anterior |
| GET | /dashboard/monthly?months= | evolución ingresos/gastos/neto/balance |
| GET | /dashboard/period | totales (ingresos, gastos, neto, ahorro) de un rango de fechas |
| GET | /dashboard/categories | totales por categoría en un rango |
| GET | /dashboard/daily?month= | ingresos/gastos por día |
| GET | /export/csv | CSV (streaming) con los mismos filtros del listado |
| GET | /export/excel | .xlsx: Movimientos, Resumen, Categorías |
| GET | /health | app + conexión a BD |

Paginación: `data = {items, total, page, page_size, total_pages}`, `page_size ∈ {10,25,50,100}`.

## 6. Autenticación

Sesiones **opacas en servidor** + cookie HttpOnly, en lugar de JWT:

- Login genera un token aleatorio de 256 bits (`secrets.token_urlsafe(32)`), se guarda solo su
  HMAC-SHA256 (clave `SECRET_KEY`) en `user_sessions` y el token va en la cookie `pf_session`
  (`HttpOnly`, `SameSite=Lax`, `Secure` en producción, `Path=/`).
- Logout real: se borra la fila; el token deja de servir inmediatamente (con JWT habría que
  mantener una lista de revocación, que equivale a tener sesiones).
- Expiración de 7 días con renovación deslizante (si queda menos de la mitad, se extiende).
- Cambio de contraseña revoca todas las demás sesiones.
- CSRF: `SameSite=Lax` + ningún endpoint GET cambia estado + verificación de `Origin` en métodos
  inseguros contra la lista de orígenes permitidos.
- Nada sensible en `localStorage` (solo la preferencia de tema para evitar parpadeo).
- Rate limiting en login y registro (ventana deslizante por IP).
- Login con email inexistente ejecuta igualmente una verificación Argon2 para no filtrar
  existencia de cuentas por tiempo de respuesta.

## 7. Estrategia frontend

- `services/api/client.ts` es el único punto con `fetch`: base URL, `credentials: "include"`,
  parseo del envelope, `ApiError` tipado con `code`/`details`.
- TanStack Query para todo dato del servidor; claves centralizadas en `lib/query-keys.ts`;
  las mutaciones invalidan `transactions`, `dashboard` y `categories` según corresponda.
- Un 401 global limpia la sesión en caché y redirige a `/login`.
- Formularios con React Hook Form + Zod; los esquemas reflejan las validaciones del backend y
  los errores del backend (`details.fields`) se mapean a los campos.
- Rutas: `/login`, `/register`, `/` (dashboard), `/transactions`, `/categories`, `/reports`,
  `/settings`.
- Tablas en desktop, tarjetas en móvil (< 768px). Sidebar fijo en desktop, drawer en móvil.
- Tema: clase `dark` en `<html>`; script externo `theme-init.js` aplica la preferencia antes del
  primer pintado; la preferencia se sincroniza con el servidor.
- Idioma de la interfaz: español (es-CL). Código en inglés.

## 8. Estrategia Docker

- `db`: `postgres:16-alpine`, volumen nombrado, credenciales por env, healthcheck `pg_isready`.
- `backend`: imagen multi-stage `python:3.12-slim`, usuario no root. El entrypoint:
  1. espera activamente a que PostgreSQL acepte conexiones (`python -m app.db.wait_for_db`,
     reintentos con backoff, no basta con que el contenedor haya arrancado);
  2. ejecuta `alembic upgrade head`;
  3. inicia uvicorn con `--proxy-headers`.
  Healthcheck contra `/health`.
- `frontend`: build con Node, servido por `nginx:alpine` que además hace proxy de `/api` y
  `/health` al backend. Cabeceras de seguridad y CSP en nginx.
- `depends_on` con `condition: service_healthy` en la cadena db → backend → frontend.
- `docker-compose.dev.yml`: bind mounts, `uvicorn --reload`, Vite dev server.

## 9. Plan de implementación

Fases 1–12 tal como en el requerimiento. Cada fase termina con `pytest`, `ruff`, `mypy`,
`npm run lint` y `npm run build` en verde.

## 10. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| SQLite no tiene DECIMAL nativo (dev/tests) | Producción en PostgreSQL. En SQLite los montos se cuantizan a 2 decimales al leer; los tests cubren montos realistas. `TEST_DATABASE_URL` permite correr la suite contra PostgreSQL en CI |
| Rate limit en memoria no se comparte entre workers/instancias | Documentado; para escalar horizontalmente reemplazar por Redis (interfaz aislada en `core/rate_limit.py`) |
| Exportaciones grandes en Excel cargan el workbook en memoria | CSV es streaming; Excel limitado a 50.000 filas con error claro |
| Zona horaria del usuario vs fecha del servidor | `transaction_date` es `DATE`; "hoy" se resuelve con la zona del usuario |
| Cambio de moneda con datos existentes | Sin conversión; validación de decimales al cambiar a CLP |

## 11. Decisiones tomadas

1. Sesiones opacas en servidor en lugar de JWT (revocación real, menos superficie).
2. Montos positivos + `type`; nunca montos negativos almacenados.
3. `transaction.type` se conserva (lo pide el modelo) pero debe coincidir con la categoría.
4. Eliminar una categoría en uso exige `reassign_to` (categoría del mismo tipo); alternativa en la
   UI: desactivarla.
5. Categorías por defecto se crean al registrarse.
6. `DELETE` → `204`. Resto → envelope `{"data", "message"}`.
7. Selector de fecha: `<input type="date">` nativo estilizado (mejor en móvil y accesible por
   defecto) envuelto en el componente `DatePicker`.
8. Protección contra inyección de fórmulas en CSV/Excel (prefijo `'` en textos que empiezan con
   `= + - @`).

## 12. Cambios durante la implementación

- `GET /dashboard/period`: agregado para que la página de Reportes muestre totales de cualquier
  rango sin hacer aritmética de dinero en el frontend.
- FK `transactions.category_id` con `NO ACTION` (no `RESTRICT`): igual de estricta para borrar
  categorías en uso, pero se verifica al final de la sentencia y permite el borrado en cascada
  de un usuario.
- Columnas de fecha/hora con un tipo `UTCDateTime`: SQLite no guarda zona horaria y devolvía
  fechas "naive"; ahora la API siempre emite UTC con offset.
- nginx sobrescribe `X-Forwarded-For` con la IP real del cliente (no la concatena) para que el
  rate limiting no se pueda evadir falsificando la cabecera.
- Paleta de gráficos validada para daltonismo y contraste (ingresos azul, gastos naranja,
  balance aqua) en modo claro y oscuro. Ningún dato depende solo del color: signos, íconos,
  etiquetas, leyendas y vista de tabla en cada gráfico.
