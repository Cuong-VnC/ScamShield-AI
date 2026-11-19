"""Public URL-list aggregates, cached independently of prediction."""

import asyncio
from time import monotonic
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from starlette.concurrency import run_in_threadpool

from database import fetch_public_stats


CACHE_TTL = 600
UNAVAILABLE_TTL = 60
MAX_SAFE_COUNT = (1 << 53) - 1  # Preserve exact integer counts in browsers.
router = APIRouter()


class PublicStats(BaseModel):
    model_config = ConfigDict(frozen=True)

    phishing_urls: int | None = None
    legitimate_urls: int | None = None
    total_urls: int | None = None
    malicious_ratio_percent: float | None = None
    status: Literal["available", "partial", "unavailable"] = "unavailable"


def _count(row, key):
    value = row.get(key)
    return value if type(value) is int and 0 <= value <= MAX_SAFE_COUNT else None


def _parse_stats(data):
    """Both reviewed storage contracts return a single row with two counts."""
    row = data[0] if isinstance(data, list) and len(data) == 1 else data
    if not isinstance(row, dict):
        return PublicStats()

    phishing = _count(row, "phishing_urls")
    legitimate = _count(row, "legitimate_urls")
    total = None
    ratio = None
    if phishing is not None and legitimate is not None:
        combined = phishing + legitimate
        reported_total = _count(row, "total_urls")
        if reported_total is not None and reported_total != combined:
            # A contradictory total can indicate inconsistent counting scopes.
            return PublicStats()
        if combined <= MAX_SAFE_COUNT and (row.get("total_urls") is None or reported_total is not None):
            total = combined
            if total > 0:
                ratio = 100 * phishing / total

    present = sum(value is not None for value in (phishing, legitimate, total, ratio))
    status = "available" if present == 4 else "partial" if present else "unavailable"
    return PublicStats(
        phishing_urls=phishing,
        legitimate_urls=legitimate,
        total_urls=total,
        malicious_ratio_percent=ratio,
        status=status,
    )


class StatsCache:
    """At most one refresh per worker without blocking a thread per waiting request."""

    def __init__(self):
        self._lock = asyncio.Lock()
        self._value = PublicStats()
        self._expires = 0.0

    async def get(self):
        if monotonic() < self._expires:
            return self._value
        async with self._lock:
            if monotonic() >= self._expires:
                payload = await run_in_threadpool(fetch_public_stats)
                self._value = _parse_stats(payload)
                ttl = UNAVAILABLE_TTL if self._value.status == "unavailable" else CACHE_TTL
                self._expires = monotonic() + ttl
            return self._value


_cache = StatsCache()


@router.get("/stats", response_model=PublicStats)
async def stats():
    return await _cache.get()
