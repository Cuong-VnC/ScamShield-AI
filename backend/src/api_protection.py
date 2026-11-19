"""Request identification, safe errors and per-process API limits."""

import ipaddress
import logging
import os
from collections import OrderedDict
from contextlib import contextmanager
from contextvars import ContextVar
from threading import BoundedSemaphore, Lock
from time import monotonic
from uuid import uuid4

import anyio
from fastapi import HTTPException
from starlette.responses import JSONResponse


logger = logging.getLogger("uvicorn.error.scamshield")
request_id = ContextVar("request_id", default="-")
MAX_BODY_BYTES = 16 * 1024
BODY_TIMEOUT = 5
_slots = BoundedSemaphore(4)


class ApiError(HTTPException):
    def __init__(self, status_code, detail, code, headers=None):
        super().__init__(status_code, detail, headers)
        self.code = code


def error_response(status, detail, code, headers=None):
    return JSONResponse(
        {"detail": detail, "error_code": code, "request_id": request_id.get()},
        status_code=status, headers=headers,
    )


def log_failure(event, exc, *, level=logging.WARNING):
    logger.log(level, "%s request_id=%s exception_type=%s",
               event, request_id.get(), type(exc).__name__)


@contextmanager
def analysis_slot():
    if not _slots.acquire(blocking=False):
        raise ApiError(503, "Server is busy", "SERVER_BUSY", {"Retry-After": "2"})
    try:
        yield
    finally:
        _slots.release()


def _client_key(scope):
    trusted = os.getenv("FORWARDED_ALLOW_IPS")
    # Uvicorn 0.24 may already have replaced scope["client"] when trust is "*".
    # Render Python sets this wildcard by default; use a shared bucket in that case.
    if "*" in (item.strip() for item in (trusted or "").split(",")) or (
        os.getenv("RENDER") == "true" and not trusted
    ):
        return None
    peer = scope.get("client")
    try:
        addr = ipaddress.ip_address(peer[0]) if peer else None
    except ValueError:
        return None
    if addr is None or (os.getenv("RENDER") == "true" and not addr.is_global):
        return None
    if addr.version == 6:
        if addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(ipaddress.ip_network((addr, 64), strict=False).network_address)
    return str(addr)


class RateLimiter:
    def __init__(self, max_peers=4096):
        self._peers = OrderedDict()
        self._shared = None
        self._max_peers = max_peers
        self._lock = Lock()

    def allow(self, key):
        # Shared fallback: burst 30, refill 180/min. Per peer: burst 15, refill 30/min.
        capacity, refill = (30, 3) if key is None else (15, 0.5)
        with self._lock:
            now = monotonic()
            last = self._shared if key is None else self._peers.pop(key, None)
            tokens = capacity if last is None else min(capacity, last[0] + (now - last[1]) * refill)
            allowed = tokens >= 1
            entry = (tokens - int(allowed), now)
            if key is None:
                self._shared = entry
            else:
                self._peers[key] = entry
                if len(self._peers) > self._max_peers:
                    self._peers.popitem(last=False)
        return allowed


class RequestProtection:
    def __init__(self, app):
        self.app = app
        self.limiter = RateLimiter()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        method, path = scope["method"], scope["path"]
        guarded = (method, path) in {("POST", "/predict"), ("GET", "/domain-info")}
        rid = uuid4().hex
        token = request_id.set(rid)
        status = None

        async def send_with_id(message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                message = {**message, "headers": [*message["headers"], (b"x-request-id", rid.encode("ascii"))]}
            await send(message)

        try:
            if guarded and not self.limiter.allow(_client_key(scope)):
                response = error_response(429, "Too many requests", "RATE_LIMITED", {"Retry-After": "2"})
                await response(scope, receive, send_with_id)
                return
            if guarded and method == "POST":
                body = bytearray()
                try:
                    with anyio.fail_after(BODY_TIMEOUT):
                        while True:
                            message = await receive()
                            if message["type"] == "http.disconnect":
                                return
                            chunk = message.get("body", b"")
                            if len(body) + len(chunk) > MAX_BODY_BYTES:
                                response = error_response(413, "Request body too large", "INVALID_REQUEST")
                                await response(scope, receive, send_with_id)
                                return
                            body.extend(chunk)
                            if not message.get("more_body"):
                                break
                except TimeoutError:
                    response = error_response(408, "Request body timed out", "REQUEST_TIMEOUT")
                    await response(scope, receive, send_with_id)
                    return

                async def replay():
                    nonlocal body
                    if body is None:
                        return await receive()
                    data, body = bytes(body), None
                    return {"type": "http.request", "body": data, "more_body": False}

                await self.app(scope, replay, send_with_id)
            else:
                await self.app(scope, receive, send_with_id)
        except Exception as exc:
            log_failure("request_failed", exc, level=logging.ERROR)
            if status is not None:
                raise
            response = error_response(500, "Internal server error", "INTERNAL_ERROR")
            await response(scope, receive, send_with_id)
        finally:
            # Log only fixed route names; query strings can contain user tokens.
            if guarded and status is not None and status not in {429, 413, 408}:
                logger.info("request request_id=%s route=%s status=%d", rid, path, status)
            request_id.reset(token)
