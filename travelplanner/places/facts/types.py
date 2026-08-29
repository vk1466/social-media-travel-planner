"""Shared envelopes for place-facts tools."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable


def utc_now_iso() -> str:
  return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class FactQuery:
  place_id: str
  display_name: str
  category: str
  latitude: float
  longitude: float
  aliases: tuple[str, ...] = ()
  country: str | None = None
  country_code: str | None = None
  city: str | None = None
  state_province: str | None = None
  provider_place_id: str | None = None


@dataclass(frozen=True)
class SourceDocument:
  tool_id: str
  source_name: str
  source_ref: str
  title: str
  latitude: float | None
  longitude: float | None
  content: dict[str, Any]
  retrieved_at: str


@dataclass(frozen=True)
class FactTool:
  tool_id: str
  description: str
  source_name: str
  categories: frozenset[str]  # empty = all categories
  cost_class: str  # free | paid
  requires_setting: str | None  # env var that gates it
  fetch: Callable[[FactQuery], list[SourceDocument]]
