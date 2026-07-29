"""Shared place identity helpers — one home for visitable / region / distance / keys.

Timeline, ingest steps, and hierarchy should import from here rather than
reimplementing geometry or accept-policy checks.
"""

from __future__ import annotations

from travelplanner.places.locate import haversine_meters, name_similarity
from travelplanner.places.resolve import same_region
from travelplanner.places.store import is_visitable_place, place_key, slugify

__all__ = [
  "haversine_meters",
  "is_visitable_place",
  "name_similarity",
  "place_key",
  "same_region",
  "slugify",
]
