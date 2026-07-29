from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Generic, TypeVar

ContextT = TypeVar("ContextT")


@dataclass(frozen=True)
class Step(Generic[ContextT]):
  """Pipeline step descriptor consumed by the runner."""

  name: str
  run: Callable[[ContextT], ContextT]
  retry_attempts: int = 0
  retry_backoff_seconds: float = 0.0
  retry_on: tuple[type[Exception], ...] = ()
  writes_data: bool = False
  idempotency_key: Callable[[ContextT], str] | None = None
