"""In-memory sliding-window rate limiter.

Scope: a single process. With several workers or instances each one keeps its own
counters, so the effective limit is multiplied; swap `SlidingWindowRateLimiter` for a
Redis-backed implementation with the same `hit` signature to share state.
"""

from __future__ import annotations

import math
import threading
import time
from collections import deque
from collections.abc import Callable

from app.core.errors import RateLimitError


class SlidingWindowRateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic, max_keys: int = 10_000):
        self._clock = clock
        self._max_keys = max_keys
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> None:
        """Record a hit for `key`; raise `RateLimitError` if the limit is exceeded."""
        now = self._clock()
        cutoff = now - window_seconds
        with self._lock:
            hits = self._hits.get(key)
            if hits is None:
                if len(self._hits) >= self._max_keys:
                    self._evict(cutoff)
                hits = deque()
                self._hits[key] = hits
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= limit:
                retry_after = max(1, math.ceil(hits[0] + window_seconds - now))
                raise RateLimitError(retry_after=retry_after)
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def _evict(self, cutoff: float) -> None:
        stale = [key for key, hits in self._hits.items() if not hits or hits[-1] <= cutoff]
        for key in stale:
            del self._hits[key]
        if len(self._hits) >= self._max_keys:
            # Still full of active keys: drop the oldest half to bound memory.
            oldest = sorted(self._hits, key=lambda k: self._hits[k][-1])
            for key in oldest[: len(oldest) // 2]:
                del self._hits[key]


auth_rate_limiter = SlidingWindowRateLimiter()
