"""Classify Timeline resolve failures into skip reasons.

When reverse-geocode finds a gas station or highway pin we used to count that
as `skipped_unresolved`, which buried real travel misses. Prefer OSM tags;
fall back to name patterns when tags are missing or vague.
"""

from __future__ import annotations

import re
from typing import Literal

from travelplanner.models import PlaceLocation

SkipReason = Literal["errand", "highway", "address", "parking", "unresolved"]

# Mirror travelplanner.places.store non-travel amenity/shop sets (keep local so
# timeline classification does not depend on private store constants).
_ERRAND_AMENITIES = frozenset(
  {
    "fuel",
    "pharmacy",
    "hospital",
    "clinic",
    "doctors",
    "dentist",
    "veterinary",
    "bank",
    "atm",
    "school",
    "kindergarten",
    "college",
    "university",
    "post_office",
    "car_wash",
    "car_rental",
    "toilets",
    "recycling",
    "waste_disposal",
    "police",
    "fire_station",
    "bench",
    "drinking_water",
    "bicycle_parking",
    "vending_machine",
    "parcel_locker",
    "waste_basket",
  }
)

_PARKING_AMENITIES = frozenset(
  {
    "parking",
    "parking_entrance",
    "charging_station",
  }
)

_ERRAND_SHOPS = frozenset(
  {
    "supermarket",
    "convenience",
    "grocery",
    "greengrocer",
    "butcher",
    "doityourself",
    "hardware",
    "laundry",
    "dry_cleaning",
    "car",
    "car_parts",
    "car_repair",
    "wholesale",
    "variety_store",
    "chemist",
    "hairdresser",
    "beauty",
    "tailor",
    "cannabis",
    "tobacco",
    "copyshop",
    "stationery",
    "mobile_phone",
    "electronics",
    "optician",
  }
)

_TRAVEL_HIGHWAY_TYPES = frozenset(
  {"path", "footway", "track", "steps", "bridleway"}
)

_RESIDENTIAL_TYPES = frozenset(
  {
    "house",
    "houses",
    "residential",
    "apartments",
    "detached",
    "terrace",
    "semidetached_house",
    "bungalow",
    "static_caravan",
    "garage",
    "garages",
    "shed",
    "hut",
  }
)

_GAS_NAME = re.compile(
  r"\b("
  r"arco|shell|chevron|valero|pilot|bp|esso|mobil|exxon|texaco|"
  r"towne\s*pump|bonneau\s*gas|canco|gas\s*station|fuel|"
  r"truck\s*stop|gordy'?s\s+truck"
  r")\b",
  re.IGNORECASE,
)

_PHARMACY_RETAIL_NAME = re.compile(
  r"\b("
  r"walgreens|rite\s*aid|cvs|pharmacy|safeway|fred\s*meyer|"
  r"costco|ace\s*hardware|dollar\s*tree|walmart|target|"
  r"cannabis|smoke\s*shop"
  r")\b",
  re.IGNORECASE,
)

_PARKING_NAME = re.compile(
  r"\b(parking|supercharger|charging\s*station|park\s*&\s*ride)\b",
  re.IGNORECASE,
)

_HIGHWAY_NAME = re.compile(
  r"\b("
  r"interstate|i[\s-]?\d+|us\s+route|us\s+\d+|route\s+\d+|hwy|highway|"
  r"freeway|motorway|rest\s*area|customs|nexus|bus\s*lane|frontage\s*road"
  r")\b",
  re.IGNORECASE,
)

_STREET_ADDRESS = re.compile(
  r"^\d+[A-Za-z]?\s+.+\b("
  r"st|street|ave|avenue|rd|road|dr|drive|ln|lane|way|blvd|boulevard|"
  r"ct|court|pl|place|cir|circle|hwy|highway"
  r")\.?\b",
  re.IGNORECASE,
)

_BARE_HOUSE_NUMBER = re.compile(r"^\d+[A-Za-z]?(?:\s*/\s*\d+[A-Za-z]?)?$")


def classify_skip_from_osm(location: PlaceLocation) -> SkipReason | None:
  """Map a reverse-geocode hit to a skip reason, or None if not clearly skippable."""
  osm_class = (location.osm_class or "").strip().lower()
  osm_type = (location.osm_type or "").strip().lower()

  if osm_class == "amenity" and osm_type in _PARKING_AMENITIES:
    return "parking"
  if osm_class == "amenity" and osm_type in _ERRAND_AMENITIES:
    return "errand"
  if osm_class == "shop" and osm_type in _ERRAND_SHOPS:
    return "errand"
  # Most remaining shops are errands; gift/outdoor/sports may be travel.
  if osm_class == "shop" and osm_type not in {"gift", "outdoor", "sports", "bicycle"}:
    return "errand"

  if osm_class == "highway":
    if osm_type in _TRAVEL_HIGHWAY_TYPES:
      return None
    return "highway"
  if osm_class in {"railway", "public_transport", "aeroway"}:
    return "highway"

  if osm_type in _RESIDENTIAL_TYPES:
    return "address"
  if osm_class == "place" and osm_type in {"house", "houses", "plot"}:
    return "address"
  if osm_class == "building" and osm_type in {
    "house",
    "residential",
    "apartments",
    "garage",
    "garages",
    "industrial",
    "warehouse",
    "college",
    "school",
    "university",
    "parking",
  }:
    if osm_type == "parking":
      return "parking"
    if osm_type in {"college", "school", "university", "industrial", "warehouse"}:
      return "errand"
    return "address"

  display = (location.display_name or "").strip()
  if _BARE_HOUSE_NUMBER.match(display) or _STREET_ADDRESS.match(display):
    # Keep named attractions that happen to start with a number.
    if osm_class not in {"tourism", "leisure", "historic", "natural", "waterway"}:
      return "address"

  return None


def classify_skip_from_name(*names: str | None) -> SkipReason | None:
  """Name-pattern fallback when OSM tags are missing or too vague."""
  text = " ".join(part for part in names if part).strip()
  if not text:
    return None
  if _GAS_NAME.search(text) or _PHARMACY_RETAIL_NAME.search(text):
    return "errand"
  if _PARKING_NAME.search(text):
    return "parking"
  if _HIGHWAY_NAME.search(text):
    return "highway"
  first = text.split(",")[0].strip()
  if _BARE_HOUSE_NUMBER.match(first) or _STREET_ADDRESS.match(first):
    return "address"
  if _STREET_ADDRESS.match(text):
    return "address"
  return None


def classify_skip_reason(
  *,
  location: PlaceLocation | None = None,
  place_name: str | None = None,
  address: str | None = None,
) -> SkipReason:
  """Best-effort skip reason for a cluster we could not turn into a Visit."""
  if location is not None:
    from_osm = classify_skip_from_osm(location)
    if from_osm is not None:
      return from_osm
    from_name = classify_skip_from_name(
      location.display_name,
      place_name,
      address,
    )
    if from_name is not None:
      return from_name
  else:
    from_name = classify_skip_from_name(place_name, address)
    if from_name is not None:
      return from_name
  return "unresolved"
