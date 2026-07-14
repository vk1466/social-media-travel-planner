from __future__ import annotations

import ssl
from dataclasses import dataclass
from typing import Any

import certifi
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim
from geopy.location import Location

USER_AGENT = "social-media-travel-planner (place enrichment)"
MIN_DELAY_SECONDS = 1

# Some Python installs (notably python.org's macOS builds) don't ship a
# working system CA bundle, which breaks HTTPS geocoding requests with an
# SSL_CERT_VERIFY_FAILED error. Using certifi's bundle explicitly sidesteps
# that regardless of how the interpreter was installed.
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

_geolocator = Nominatim(user_agent=USER_AGENT, timeout=10, ssl_context=_SSL_CONTEXT)
_rate_limited_geocode = RateLimiter(
  _geolocator.geocode,
  min_delay_seconds=MIN_DELAY_SECONDS,
  swallow_exceptions=False,
)
_rate_limited_reverse = RateLimiter(
  _geolocator.reverse,
  min_delay_seconds=MIN_DELAY_SECONDS,
  swallow_exceptions=False,
)


@dataclass(frozen=True)
class GeocodeResult:
  """Provider-neutral geocode hit used by the place pipelines."""

  display_name: str
  latitude: float
  longitude: float
  country: str | None = None
  country_code: str | None = None
  state_province: str | None = None
  city: str | None = None
  provider_place_id: str | None = None
  category: str | None = None
  provider: str = "nominatim"
  osm_class: str | None = None
  osm_type: str | None = None
  raw: dict[str, Any] | None = None


# Geopy/Nominatim viewbox: [[south_lat, west_lon], [north_lat, east_lon]]
Viewbox = tuple[tuple[float, float], tuple[float, float]]


def get_client() -> Nominatim:
  return _geolocator


def geocode(query: str) -> Location | None:
  """Forward-geocode a free-text query (e.g. "Multnomah Falls, Portland, USA")
  into a canonical location. Nominatim (OSM); rate-limited to 1 req/sec."""
  return _rate_limited_geocode(query, addressdetails=True, language="en")


def geocode_many(
  query: str,
  *,
  limit: int = 5,
  viewbox: Viewbox | None = None,
  bounded: bool = False,
) -> list[Location]:
  """Forward-geocode returning up to `limit` candidates (for ranking)."""
  kwargs: dict[str, Any] = {
    "exactly_one": False,
    "limit": max(1, limit),
    "addressdetails": True,
    "language": "en",
  }
  if viewbox is not None:
    kwargs["viewbox"] = viewbox
    kwargs["bounded"] = bounded
  locations = _rate_limited_geocode(query, **kwargs)
  if locations is None:
    return []
  if isinstance(locations, Location):
    return [locations]
  return list(locations)


def reverse_geocode(latitude: float, longitude: float) -> Location | None:
  """Reverse-geocode coordinates (e.g. from an Instagram location tag) into a
  canonical location and address hierarchy."""
  return _rate_limited_reverse((latitude, longitude), addressdetails=True, language="en")


def viewbox_around(latitude: float, longitude: float, *, half_span_degrees: float = 0.25) -> Viewbox:
  """Build a geopy viewbox centered on a lat/lon (≈ half_span × 111km)."""
  south = latitude - half_span_degrees
  north = latitude + half_span_degrees
  west = longitude - half_span_degrees
  east = longitude + half_span_degrees
  return ((south, west), (north, east))


def _extract_display_name(raw: dict[str, Any], fallback: str) -> str:
  name = raw.get("name")
  if name:
    return str(name)
  display_name = raw.get("display_name")
  if display_name:
    return str(display_name).split(",")[0].strip()
  return fallback


def _category_from_osm(
  osm_class: str | None,
  osm_type: str | None,
  *,
  addresstype: str | None = None,
) -> str | None:
  """Map OSM class/type into a coarse provider-neutral category."""
  if not osm_class and not osm_type:
    return None
  osm_class = (osm_class or "").lower()
  osm_type = (osm_type or "").lower()
  addresstype = (addresstype or "").lower()

  # Town/city boundaries are travel destinations (Banff, Cannon Beach), not
  # states/countries — Nominatim often returns them as boundary=administrative.
  _SETTLEMENT_ADDRESS = frozenset(
    {
      "town",
      "city",
      "village",
      "hamlet",
      "suburb",
      "neighbourhood",
      "neighborhood",
      "municipality",
      "quarter",
      "borough",
    }
  )
  if addresstype in _SETTLEMENT_ADDRESS and osm_type in {
    "administrative",
    "town",
    "city",
    "village",
    "hamlet",
    "municipality",
  }:
    return "place"

  if osm_class == "boundary" or osm_type in {"state", "region", "country", "continent", "administrative"}:
    return "administrative"
  if osm_class == "office":
    return "office"
  if osm_class == "shop" or osm_type in {"commercial", "retail"}:
    return "commercial"
  if osm_class in {"tourism", "leisure", "natural", "historic"}:
    if osm_type in {"attraction", "viewpoint", "museum", "gallery", "zoo", "theme_park"}:
      return "attraction"
    if osm_type in {"park", "nature_reserve", "national_park"} or osm_class == "natural":
      return "natural"
    if osm_class == "tourism":
      return "attraction"
    return osm_class
  if osm_class in {"water", "waterway"}:
    return osm_class
  if osm_class == "man_made":
    return "man_made"
  if osm_class == "amenity":
    if osm_type in {"restaurant", "cafe", "bar", "pub", "fast_food", "biergarten"}:
      return "food"
    if osm_type in {"hotel", "hostel", "motel", "guest_house"}:
      return "lodging"
    if osm_type == "parking":
      return "parking"
    # Landmarks tagged as amenity (Sydney Opera House = arts_centre).
    if osm_type in {"arts_centre", "theatre", "cinema", "fountain", "place_of_worship"}:
      return "attraction"
    return "amenity"
  if osm_class == "highway":
    if osm_type in {"path", "footway", "track", "steps", "bridleway"}:
      return "attraction"
    # Named residential/service roads that collide with landmarks.
    return "highway"
  if osm_class == "place" and osm_type in {
    "islet",
    "island",
    "locality",
    "hamlet",
    "town",
    "city",
    "village",
  }:
    return "place"
  return osm_class or osm_type or None


def _from_nominatim_location(location: Location, fallback_name: str = "") -> GeocodeResult:
  raw = location.raw if isinstance(location.raw, dict) else {}
  address = raw.get("address", {}) if isinstance(raw.get("address"), dict) else {}
  country_code = address.get("country_code")
  country_code = str(country_code).upper() if country_code else None
  city = (
    address.get("city")
    or address.get("town")
    or address.get("village")
    or address.get("municipality")
    or address.get("county")
  )
  state_province = address.get("state") or address.get("state_district") or address.get("province")
  provider_place_id = raw.get("place_id") or raw.get("osm_id")
  osm_class = str(raw.get("class")) if raw.get("class") else None
  osm_type = str(raw.get("type")) if raw.get("type") else None
  addresstype = str(raw.get("addresstype")) if raw.get("addresstype") else None

  return GeocodeResult(
    display_name=_extract_display_name(raw, fallback_name or str(location)),
    latitude=float(location.latitude),
    longitude=float(location.longitude),
    country=str(address["country"]) if address.get("country") else None,
    country_code=country_code,
    state_province=str(state_province) if state_province else None,
    city=str(city) if city else None,
    provider_place_id=str(provider_place_id) if provider_place_id is not None else None,
    category=_category_from_osm(osm_class, osm_type, addresstype=addresstype),
    provider="nominatim",
    osm_class=osm_class,
    osm_type=osm_type,
    raw=raw,
  )


def geocode_normalized(query: str, *, fallback_name: str = "") -> GeocodeResult | None:
  """Forward-geocode into a provider-neutral result (single top hit)."""
  location = geocode(query)
  if location is None:
    return None
  return _from_nominatim_location(location, fallback_name=fallback_name or query)


def geocode_normalized_many(
  query: str,
  *,
  fallback_name: str = "",
  limit: int = 5,
  viewbox: Viewbox | None = None,
  bounded: bool = False,
) -> list[GeocodeResult]:
  """Forward-geocode into ranked provider-neutral candidates."""
  locations = geocode_many(query, limit=limit, viewbox=viewbox, bounded=bounded)
  return [
    _from_nominatim_location(location, fallback_name=fallback_name or query)
    for location in locations
  ]


def reverse_geocode_normalized(
  latitude: float,
  longitude: float,
  *,
  fallback_name: str = "",
) -> GeocodeResult | None:
  """Reverse-geocode into a provider-neutral result."""
  location = reverse_geocode(latitude, longitude)
  if location is None:
    return None
  return _from_nominatim_location(location, fallback_name=fallback_name)
