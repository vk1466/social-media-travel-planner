"""Place pipeline: normalize → locate → resolve/upsert → store."""

from __future__ import annotations

from travelplanner.db.places_repo import place_from_dict, place_to_dict
from travelplanner.places.candidates import RetryResult, retry_place_candidates
from travelplanner.places.constants import COUNTRY_CODE_TO_CONTINENT, NEAR_DUPLICATE_METERS
from travelplanner.places.locate import LocateDebugResult, geocode_queries, locate_mention, locate_mention_debug
from travelplanner.places.mentions import mentions_from_post
from travelplanner.places.pipeline import process_post_places, reprocess_all_places
from travelplanner.places.resolve import find_existing_place, upsert_place
from travelplanner.places.store import (
  cleanup_all_data,
  delete_all_places,
  is_visitable_place,
  list_places,
  load_all_places,
  load_place,
  place_key,
  save_place,
  slugify,
  unlink_post_from_places,
)

__all__ = [
  "COUNTRY_CODE_TO_CONTINENT",
  "LocateDebugResult",
  "NEAR_DUPLICATE_METERS",
  "RetryResult",
  "cleanup_all_data",
  "delete_all_places",
  "find_existing_place",
  "geocode_queries",
  "is_visitable_place",
  "list_places",
  "load_all_places",
  "load_place",
  "locate_mention",
  "locate_mention_debug",
  "mentions_from_post",
  "place_from_dict",
  "place_key",
  "place_to_dict",
  "process_post_places",
  "reprocess_all_places",
  "retry_place_candidates",
  "save_place",
  "slugify",
  "unlink_post_from_places",
  "upsert_place",
]
