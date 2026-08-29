"""Registry of place-facts fetch tools."""

from __future__ import annotations

import os

from travelplanner.places.facts.tools.google import fetch_google_place_details
from travelplanner.places.facts.tools.nps import fetch_nps_park
from travelplanner.places.facts.tools.osm import fetch_osm_tags
from travelplanner.places.facts.tools.wikipedia import fetch_wikipedia_summary
from travelplanner.places.facts.types import FactTool

FACT_TOOLS: tuple[FactTool, ...] = (
  FactTool(
    tool_id="osm_tags",
    description="OpenStreetMap tags near the pin (hours, fee, website, cuisine)",
    source_name="osm",
    categories=frozenset(),  # all
    cost_class="free",
    requires_setting=None,
    fetch=fetch_osm_tags,
  ),
  FactTool(
    tool_id="wikipedia_summary",
    description="Wikipedia page summary for parks, landmarks, and similar",
    source_name="wikipedia",
    categories=frozenset(
      {
        "park",
        "landmark",
        "museum",
        "city",
        "neighborhood",
        "lake",
        "waterfall",
        "beach",
      }
    ),
    cost_class="free",
    requires_setting=None,
    fetch=fetch_wikipedia_summary,
  ),
  FactTool(
    tool_id="google_place_details",
    description="Google Maps place details via Mindcase (hours, phone, website)",
    source_name="google_places",
    categories=frozenset(),  # all travel categories
    cost_class="paid",
    requires_setting="MINDCASE_API_KEY",
    fetch=fetch_google_place_details,
  ),
  FactTool(
    tool_id="nps_park",
    description="US National Park Service park facts",
    source_name="nps",
    categories=frozenset({"park", "landmark"}),
    cost_class="free",
    requires_setting="NPS_API_KEY",
    fetch=fetch_nps_park,
  ),
)


def _setting_present(name: str | None) -> bool:
  if not name:
    return True
  value = os.getenv(name, "").strip()
  return bool(value)


def select_tools(category: str | None) -> list[FactTool]:
  """Catalog lookup for a category; skips tools whose setting gate is unset."""
  selected: list[FactTool] = []
  for tool in FACT_TOOLS:
    if tool.categories and (not category or category not in tool.categories):
      continue
    if not _setting_present(tool.requires_setting):
      continue
    selected.append(tool)
  return selected
