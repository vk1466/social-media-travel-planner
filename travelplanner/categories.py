"""Attraction category vocab and merge helpers.

Exactly one category per place; zero or more category-scoped attributes.
No subcategory; no dual category.
"""

from __future__ import annotations

CATEGORIES: tuple[str, ...] = (
  "hike",
  "viewpoint",
  "waterfall",
  "beach",
  "park",
  "city",
  "landmark",
  "museum",
  "market",
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "neighborhood",
)

# Sentinel for library/API filters that match Place.category is None.
UNCATEGORIZED = "uncategorized"

# Broad containers that should win hierarchy root election.
ROOT_CATEGORIES: frozenset[str] = frozenset({"park", "city", "neighborhood"})

# Category-scoped facets. Grow deliberately — unknown values are dropped on write.
# A value may be both a category (for one pin) and an attribute (on another).
ATTRIBUTES_BY_CATEGORY: dict[str, tuple[str, ...]] = {
  "hike": ("viewpoint", "waterfall", "summit", "loop"),
  "viewpoint": ("hike",),
  "waterfall": ("hike", "viewpoint"),
  "beach": ("hike",),
  "park": (),
  "city": (),
  # Climbable / scenic monuments often need hike or viewpoint as a facet.
  "landmark": ("hike", "viewpoint"),
  "museum": (),
  "market": (),
  "restaurant": (),
  "cafe": (),
  "bar": (),
  "hotel": (),
  "neighborhood": (),
}

# Flat union for extract JSON-schema enum (model must pick from this list).
ALL_ATTRIBUTES: tuple[str, ...] = tuple(
  sorted({attr for attrs in ATTRIBUTES_BY_CATEGORY.values() for attr in attrs})
)

# Higher = more specific. Used for sticky merge and Phase 2 ties.
# Lower = broader container — preferred as hierarchy root.
CATEGORY_PRECEDENCE: dict[str, int] = {
  "hike": 3,
  "waterfall": 3,
  "viewpoint": 3,
  "beach": 3,
  "museum": 3,
  "market": 3,
  "restaurant": 3,
  "cafe": 3,
  "bar": 3,
  "hotel": 3,
  "landmark": 2,
  "park": 1,
  "city": 1,
  "neighborhood": 1,
}

# OSM class/type → browse category. Used when LLM left category empty (esp. parents).
_OSM_CITY_TYPES = frozenset({"city", "town", "village", "municipality", "hamlet"})
_OSM_NEIGHBORHOOD_TYPES = frozenset(
  {"suburb", "neighbourhood", "neighborhood", "quarter", "borough", "city_block"}
)
_OSM_PARK_TYPES = frozenset(
  {"park", "nature_reserve", "national_park", "protected_area", "forest"}
)
_OSM_HIKE_TYPES = frozenset({"path", "footway", "track", "steps", "bridleway", "via_ferrata"})
_OSM_VIEWPOINT_TYPES = frozenset({"viewpoint"})
_OSM_WATERFALL_TYPES = frozenset({"waterfall"})
_OSM_BEACH_TYPES = frozenset({"beach", "bay"})
_OSM_MUSEUM_TYPES = frozenset({"museum", "gallery"})
_OSM_MARKET_TYPES = frozenset({"marketplace", "market"})
_OSM_RESTAURANT_TYPES = frozenset({"restaurant", "fast_food"})
_OSM_CAFE_TYPES = frozenset({"cafe"})
_OSM_BAR_TYPES = frozenset({"bar", "pub", "biergarten"})
_OSM_HOTEL_TYPES = frozenset({"hotel", "hostel", "motel", "guest_house", "apartment"})
_OSM_LANDMARK_TYPES = frozenset(
  {
    "attraction",
    "artwork",
    "monument",
    "memorial",
    "castle",
    "ruins",
    "archaeological_site",
    "arts_centre",
    "theatre",
    "fountain",
    "place_of_worship",
    "tower",
    "lighthouse",
  }
)


def category_from_osm(
  osm_class: str | None,
  osm_type: str | None,
) -> str | None:
  """Map Nominatim OSM class/type into a Place browse category."""
  osm_class = (osm_class or "").strip().lower()
  osm_type = (osm_type or "").strip().lower()
  if not osm_class and not osm_type:
    return None

  if osm_type in _OSM_CITY_TYPES or (osm_class == "place" and osm_type in _OSM_CITY_TYPES):
    return "city"
  if osm_type in _OSM_NEIGHBORHOOD_TYPES or (
    osm_class == "place" and osm_type in _OSM_NEIGHBORHOOD_TYPES
  ):
    return "neighborhood"
  if osm_type in _OSM_PARK_TYPES or (
    osm_class in {"leisure", "boundary", "landuse"} and osm_type in _OSM_PARK_TYPES
  ):
    return "park"
  if osm_class == "natural" and osm_type in {"wood", "scrub", "heath", "grassland"}:
    return "park"
  if osm_type in _OSM_HIKE_TYPES or (osm_class == "highway" and osm_type in _OSM_HIKE_TYPES):
    return "hike"
  if osm_type in _OSM_WATERFALL_TYPES or (
    osm_class in {"waterway", "natural"} and osm_type in _OSM_WATERFALL_TYPES
  ):
    return "waterfall"
  if osm_type in _OSM_BEACH_TYPES or (osm_class == "natural" and osm_type in _OSM_BEACH_TYPES):
    return "beach"
  if osm_type in _OSM_VIEWPOINT_TYPES or (
    osm_class in {"tourism", "natural"} and osm_type in _OSM_VIEWPOINT_TYPES
  ):
    return "viewpoint"
  if osm_type in _OSM_MUSEUM_TYPES:
    return "museum"
  if osm_type in _OSM_MARKET_TYPES:
    return "market"
  if osm_type in _OSM_RESTAURANT_TYPES:
    return "restaurant"
  if osm_type in _OSM_CAFE_TYPES:
    return "cafe"
  if osm_type in _OSM_BAR_TYPES:
    return "bar"
  if osm_type in _OSM_HOTEL_TYPES or (osm_class == "tourism" and osm_type in _OSM_HOTEL_TYPES):
    return "hotel"
  if osm_type in _OSM_LANDMARK_TYPES or osm_class in {"historic", "tourism"}:
    return "landmark"
  if osm_class == "natural":
    # Peaks/volcanoes/gorges used as parent containers → landmark.
    return "landmark"
  return None


def root_category_rank(category: str | None) -> int:
  """Lower = better hierarchy root. Unknown sits between broad and specific."""
  if category is None:
    return 2
  return CATEGORY_PRECEDENCE.get(category, 2)


def attribute_allowlist_prompt_lines() -> str:
  """Human-readable allowlist block for the extract system prompt."""
  lines: list[str] = []
  for category in CATEGORIES:
    attrs = ATTRIBUTES_BY_CATEGORY.get(category, ())
    if attrs:
      lines.append(f"- {category}: {', '.join(attrs)}")
    else:
      lines.append(f"- {category}: (none)")
  return "\n".join(lines)


def normalize_category(value: str | None) -> str | None:
  """Return a known category, or None for blank/unknown values."""
  if value is None:
    return None
  text = value.strip().lower()
  if not text or text not in CATEGORIES:
    return None
  return text


def filter_attributes(category: str | None, attrs: tuple[str, ...] | list[str]) -> tuple[str, ...]:
  """Clip attrs to the allowlist for category; never keep attr == category."""
  if category is None:
    return ()
  allowed = set(ATTRIBUTES_BY_CATEGORY.get(category, ()))
  seen: set[str] = set()
  result: list[str] = []
  for raw in attrs:
    attr = raw.strip().lower() if isinstance(raw, str) else ""
    if not attr or attr == category or attr not in allowed or attr in seen:
      continue
    seen.add(attr)
    result.append(attr)
  return tuple(sorted(result))


def resolve_category(
  existing: str | None,
  incoming: str | None,
  votes: dict[str, int] | None = None,
) -> str | None:
  """Pick a single winning category (Phase 1: sticky + precedence; votes unused).

  Rules:
  - empty ← incoming
  - same → keep
  - else: never overwrite specific with broader; broader may upgrade to specific;
    same band → keep existing
  """
  del votes  # Phase 2 will use vote tallies; signature reserved now.
  existing_norm = normalize_category(existing)
  incoming_norm = normalize_category(incoming)
  if existing_norm is None:
    return incoming_norm
  if incoming_norm is None or incoming_norm == existing_norm:
    return existing_norm

  existing_rank = CATEGORY_PRECEDENCE.get(existing_norm, 0)
  incoming_rank = CATEGORY_PRECEDENCE.get(incoming_norm, 0)
  if incoming_rank > existing_rank:
    return incoming_norm
  return existing_norm
