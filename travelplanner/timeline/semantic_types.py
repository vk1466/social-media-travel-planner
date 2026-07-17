"""Google Timeline semanticType allow/block + category mapping."""

from __future__ import annotations

from typing import Literal

SemanticClass = Literal["block", "allow", "unknown"]

# Everyday / non-travel — drop before geocoding.
BLOCK_SEMANTIC: frozenset[str] = frozenset(
  {
    "TYPE_HOME",
    "TYPE_WORK",
    "HOME",
    "WORK",
    "TYPE_GAS_STATION",
    "TYPE_GAS",
    "TYPE_PARKING",
    "TYPE_PARKING_GARAGE",
    "TYPE_PARKING_LOT",
    "TYPE_GROCERY_OR_SUPERMARKET",
    "TYPE_SUPERMARKET",
    "TYPE_CONVENIENCE_STORE",
    "TYPE_PHARMACY",
    "TYPE_DRUGSTORE",
    "TYPE_GYM",
    "TYPE_BANK",
    "TYPE_ATM",
    "TYPE_HOSPITAL",
    "TYPE_DOCTOR",
    "TYPE_DENTIST",
    "TYPE_SCHOOL",
    "TYPE_UNIVERSITY",
    "TYPE_POST_OFFICE",
    "TYPE_LAUNDRY",
    "TYPE_CAR_DEALER",
    "TYPE_CAR_REPAIR",
    "TYPE_CAR_WASH",
    "TYPE_TRANSIT_STATION",
    "TYPE_BUS_STATION",
    "TYPE_SUBWAY_STATION",
    "TYPE_TRAIN_STATION",
    "TYPE_LIGHT_RAIL_STATION",
    "TYPE_AIRPORT",  # often noise for short layovers; keep lodging/attractions nearby
    "TYPE_STORAGE",
  }
)

# Travel-worthy — accept without requiring OSM gate.
ALLOW_SEMANTIC: frozenset[str] = frozenset(
  {
    "TYPE_TOURIST_ATTRACTION",
    "TYPE_MUSEUM",
    "TYPE_ART_GALLERY",
    "TYPE_PARK",
    "TYPE_NATIONAL_PARK",
    "TYPE_CAMPGROUND",
    "TYPE_RV_PARK",
    "TYPE_ZOO",
    "TYPE_AQUARIUM",
    "TYPE_AMUSEMENT_PARK",
    "TYPE_LANDMARK",
    "TYPE_CHURCH",
    "TYPE_HINDU_TEMPLE",
    "TYPE_MOSQUE",
    "TYPE_SYNAGOGUE",
    "TYPE_PLACE_OF_WORSHIP",
    "TYPE_HISTORICAL_LANDMARK",
    "TYPE_BEACH",
    "TYPE_NATURAL_FEATURE",
    "TYPE_RESTAURANT",
    "TYPE_CAFE",
    "TYPE_BAR",
    "TYPE_NIGHT_CLUB",
    "TYPE_BAKERY",
    "TYPE_FOOD",
    "TYPE_LODGING",
    "TYPE_HOTEL",
    "TYPE_RESORT_HOTEL",
    "TYPE_GUEST_HOUSE",
    "TYPE_HOSTEL",
    "TYPE_SPA",
    "TYPE_CASINO",
    "TYPE_STADIUM",
    "TYPE_PERFORMING_ARTS_THEATER",
    "TYPE_MOVIE_THEATER",
    "TYPE_SHOPPING_MALL",
    "TYPE_MARKET",
  }
)

# Vague Google labels — treat as unknown so OSM must confirm travel-worthiness.
# (TYPE_POINT_OF_INTEREST is especially noisy for residential pins.)
_UNKNOWN_SEMANTIC: frozenset[str] = frozenset(
  {
    "TYPE_POINT_OF_INTEREST",
    "TYPE_ESTABLISHMENT",
    "TYPE_PREMISE",
    "TYPE_STREET_ADDRESS",
    "TYPE_ROUTE",
    "TYPE_GEOCODE",
  }
)

# Google semanticType → our Place.category
SEMANTIC_TO_CATEGORY: dict[str, str] = {
  "TYPE_CAFE": "cafe",
  "TYPE_BAKERY": "cafe",
  "TYPE_RESTAURANT": "restaurant",
  "TYPE_FOOD": "restaurant",
  "TYPE_BAR": "bar",
  "TYPE_NIGHT_CLUB": "bar",
  "TYPE_MUSEUM": "museum",
  "TYPE_ART_GALLERY": "museum",
  "TYPE_PARK": "park",
  "TYPE_NATIONAL_PARK": "park",
  "TYPE_CAMPGROUND": "park",
  "TYPE_RV_PARK": "park",
  "TYPE_NATURAL_FEATURE": "park",
  "TYPE_BEACH": "beach",
  "TYPE_LODGING": "hotel",
  "TYPE_HOTEL": "hotel",
  "TYPE_RESORT_HOTEL": "hotel",
  "TYPE_GUEST_HOUSE": "hotel",
  "TYPE_HOSTEL": "hotel",
  "TYPE_TOURIST_ATTRACTION": "landmark",
  "TYPE_LANDMARK": "landmark",
  "TYPE_HISTORICAL_LANDMARK": "landmark",
  "TYPE_CHURCH": "landmark",
  "TYPE_HINDU_TEMPLE": "landmark",
  "TYPE_MOSQUE": "landmark",
  "TYPE_SYNAGOGUE": "landmark",
  "TYPE_PLACE_OF_WORSHIP": "landmark",
  "TYPE_ZOO": "landmark",
  "TYPE_AQUARIUM": "landmark",
  "TYPE_AMUSEMENT_PARK": "landmark",
  "TYPE_STADIUM": "landmark",
  "TYPE_PERFORMING_ARTS_THEATER": "landmark",
  "TYPE_MOVIE_THEATER": "landmark",
  "TYPE_CASINO": "landmark",
  "TYPE_SPA": "landmark",
  "TYPE_SHOPPING_MALL": "market",
  "TYPE_MARKET": "market",
  "TYPE_POINT_OF_INTEREST": "landmark",
}


def _normalize(semantic_type: str | None) -> str | None:
  if not semantic_type:
    return None
  text = semantic_type.strip().upper()
  return text or None


def classify_semantic(semantic_type: str | None) -> SemanticClass:
  """block = drop; allow = travel; unknown = defer to OSM gate."""
  key = _normalize(semantic_type)
  if key is None or key in {"TYPE_UNKNOWN", "UNKNOWN"} or key in _UNKNOWN_SEMANTIC:
    return "unknown"
  if key in BLOCK_SEMANTIC:
    return "block"
  if key in ALLOW_SEMANTIC:
    return "allow"
  return "unknown"


def category_from_semantic_type(semantic_type: str | None) -> str | None:
  key = _normalize(semantic_type)
  if key is None:
    return None
  return SEMANTIC_TO_CATEGORY.get(key)
