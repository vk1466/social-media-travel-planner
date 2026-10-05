"""Jev second look when an OSM tag would drop a named place."""

from __future__ import annotations

import logging

from travelplanner.clients.jev import system_one
from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention

logger = logging.getLogger(__name__)

_PLACE_OF_INTEREST = {
  "interest": {
    "type": "choice",
    "instructions": (
      "A named place matched a map pin whose tag often means 'not a destination' "
      "(administrative boundary, house, office, road). Ignore that tag. "
      "Keep it when a visitor or a local would go see it: a sight, neighborhood, "
      "market, museum, historic house, park, viewpoint, or similar. "
      "Drop it when it is only a city, state, or country, a private residence, "
      "an office, a street address, or an everyday errand. "
      "Drop when you are unsure."
    ),
    "criteria": {
      "keep": "Worth going to see, for a visitor or a local.",
      "drop": "Not a place of interest.",
    },
  }
}


def _state(location: PlaceLocation, mention: PlaceMention | None) -> str:
  lines = [
    f"MAP MATCH: {location.display_name}",
    f"OSM CLASS: {location.osm_class or ''}",
    f"OSM TYPE: {location.osm_type or ''}",
    f"CITY: {location.city or ''}",
    f"STATE: {location.state_province or ''}",
    f"COUNTRY: {location.country or ''}",
  ]
  if mention is not None:
    lines.extend(
      [
        f"MENTION: {mention.place_name}",
        f"MENTION CATEGORY: {mention.category or ''}",
        f"MENTION DETAILS: {mention.details or ''}",
      ]
    )
  return "\n".join(lines)


def jev_is_place_of_interest(
  location: PlaceLocation,
  mention: PlaceMention | None = None,
) -> tuple[bool, str]:
  """Return (keep, reason). Fail closed when Jev is unavailable."""
  try:
    payload = system_one(state=_state(location, mention), questions=_PLACE_OF_INTEREST)
  except Exception as exc:
    logger.warning("place interest gate failed name=%r error=%s", location.display_name, exc)
    return False, f"place interest gate unavailable ({exc})"

  answer = (payload.get("answers") or {}).get("interest") or {}
  choice = answer.get("choice")
  reason = str(answer.get("reason") or choice or "").strip() or "no reason"
  keep = choice == "keep"
  logger.info(
    "place interest gate name=%r keep=%s reason=%s",
    location.display_name,
    keep,
    reason,
  )
  return keep, reason
