"""Google Places details adapter (Phase 3). Gated by GOOGLE_MAPS_API_KEY."""

from __future__ import annotations

from travelplanner.places.facts.types import FactQuery, SourceDocument

TOOL_ID = "google_place_details"
SOURCE_NAME = "google_places"


def fetch_google_place_details(query: FactQuery) -> list[SourceDocument]:
  """Not implemented until Phase 3 — returns no documents."""
  return []
