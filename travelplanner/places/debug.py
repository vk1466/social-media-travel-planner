"""Read-only locate debug for the admin tool."""

from __future__ import annotations

from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places.locate import LocateDebugResult, locate_mention_debug


def _location_dict(location: PlaceLocation | None) -> dict | None:
  if location is None:
    return None
  return {
    "display_name": location.display_name,
    "continent": location.continent,
    "country": location.country,
    "country_code": location.country_code,
    "state_province": location.state_province,
    "city": location.city,
    "latitude": location.latitude,
    "longitude": location.longitude,
    "provider_place_id": location.provider_place_id,
    "osm_class": location.osm_class,
    "osm_type": location.osm_type,
  }


def _side_from_debug(debug: LocateDebugResult) -> dict:
  return {
    "status": debug.status,
    "location": _location_dict(debug.location),
    "queries_tried": list(debug.queries_tried),
    "notes": list(debug.notes),
    "match_confidence": debug.match_confidence,
    "category": debug.category,
    "provider": debug.provider,
  }


def debug_locate(mention: PlaceMention) -> dict:
  """Run locate for one mention; never writes places or candidates."""
  debug = locate_mention_debug(mention)
  return {
    "query": {
      "place_name": mention.place_name,
      "city": mention.city,
      "state_province": mention.state_province,
      "country": mention.country,
      "parent_place_name": mention.parent_place_name,
      "latitude": mention.latitude,
      "longitude": mention.longitude,
    },
    "result": _side_from_debug(debug),
  }
