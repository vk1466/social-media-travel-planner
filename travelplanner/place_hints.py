"""Internal place-pipeline shapes — not domain entities.

These capture raw hints from platforms and LLM extraction, then normalize
them for geocoding/upsert. The public place entity is `Place` in models.py.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformPlace:
  """Location tag or similar hint attached by the social platform."""

  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  latitude: float | None = None
  longitude: float | None = None


@dataclass(frozen=True)
class ExtractedPlace:
  """Place candidate produced by LLM extraction from post content."""

  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  details: str | None = None
  tips: tuple[str, ...] = ()
  category: str | None = None
  attributes: tuple[str, ...] = ()
  parent_place_name: str | None = None
  parent_category: str | None = None


@dataclass(frozen=True)
class PlaceMention:
  """Normalized hint the place pipeline can geocode and merge."""

  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  latitude: float | None = None
  longitude: float | None = None
  details: str | None = None
  tips: tuple[str, ...] = ()
  category: str | None = None
  attributes: tuple[str, ...] = ()
  parent_place_name: str | None = None
