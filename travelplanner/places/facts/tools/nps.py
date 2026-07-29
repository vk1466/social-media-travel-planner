"""NPS park adapter (Phase 4). Gated by NPS_API_KEY."""

from __future__ import annotations

from travelplanner.places.facts.types import FactQuery, SourceDocument

TOOL_ID = "nps_park"
SOURCE_NAME = "nps"


def fetch_nps_park(query: FactQuery) -> list[SourceDocument]:
  """Not implemented until Phase 4 — returns no documents."""
  return []
