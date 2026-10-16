"""Pure ASGI middlewares: request id + access log, security headers, origin check."""

from __future__ import annotations

import json
import logging
import re
import time
import uuid
from collections.abc import Iterable

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import error_body
from app.core.logging import request_id_var

access_logger = logging.getLogger("app.access")

_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-]{8,64}$")
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


class RequestContextMiddleware:
    """Assigns a request id, exposes it as `X-Request-ID` and logs one line per request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get("x-request-id", "")
        request_id = incoming if _REQUEST_ID_PATTERN.match(incoming) else uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message).append("X-Request-ID", request_id)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 1)
            path = scope.get("path", "")
            if path != "/health":
                access_logger.info(
                    "request",
                    extra={
                        "method": scope.get("method"),
                        "path": path,
                        "status": status_code,
                        "duration_ms": duration_ms,
                    },
                )
            request_id_var.reset(token)


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, *, hsts: bool) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        is_docs = scope.get("path", "").startswith(DOCS_PATHS)

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.setdefault("X-Content-Type-Options", "nosniff")
                headers.setdefault("X-Frame-Options", "DENY")
                headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
                headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
                headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
                if not is_docs:
                    # The API only returns JSON and files; nothing should ever render or frame it.
                    headers.setdefault(
                        "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
                    )
                    headers.setdefault("Cache-Control", "no-store")
                if self.hsts:
                    headers.setdefault(
                        "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
                    )
            await send(message)

        await self.app(scope, receive, send_wrapper)


class OriginCheckMiddleware:
    """CSRF defence in depth for cookie-authenticated, state-changing requests.

    Browsers send `Origin` on cross-site POST/PATCH/DELETE. If present, it must be the
    API's own origin or one of the configured CORS origins. Requests without `Origin`
    (curl, server-to-server, same-origin GET navigations) are not affected; the session
    cookie is `SameSite=Lax`, which already keeps it off cross-site subrequests.
    """

    def __init__(self, app: ASGIApp, *, allowed_origins: Iterable[str]) -> None:
        self.app = app
        self.allowed_origins = {origin.rstrip("/") for origin in allowed_origins}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") not in UNSAFE_METHODS:
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        origin = headers.get("origin")
        if origin is None or origin.rstrip("/") in self.allowed_origins:
            await self.app(scope, receive, send)
            return

        host = headers.get("x-forwarded-host") or headers.get("host", "")
        if origin.split("://", 1)[-1].rstrip("/") == host:
            await self.app(scope, receive, send)
            return

        body = json.dumps(
            error_body("FORBIDDEN_ORIGIN", "Origen de la solicitud no permitido.")
        ).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 403,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
