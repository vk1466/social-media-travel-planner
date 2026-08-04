"""Cheap Google geocode / Places Text Search fallback for locate (roadmap 1f).

Cost controls:
- Call only when Nominatim left no trusted pin (caller-enforced).
- Prefer Geocoding API (~cheaper) first — one request.
- Only if empty, one Places Text Search (New) with a minimal Pro field mask
  (id, name, location, address, types) — no Place Details, ratings, or photos.
- At most a few candidates; no pagination.
"""

from __future__ import annotations

import json
import logging
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import certifi

from travelplanner import settings
from travelplanner.clients.geocoder import GeocodeResult

logger = logging.getLogger(__name__)

_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
# Location + name + types → Text Search Pro SKU. Do not add rating/hours/photos.
_TEXT_SEARCH_FIELD_MASK = (
  "places.id,places.displayName,places.formattedAddress,"
  "places.location,places.types,places.shortFormattedAddress"
)
_MAX_RESULTS = 5

_GEOCODE_SKIP_TYPES = frozenset({
  "route",
  "street_address",
  "premise",
  "subpremise",
  "political",
  "locality",
  "sublocality",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "country",
  "postal_code",
  "neighborhood",
})

# Google Places type → (osm_class, osm_type, category) for visitability + ranking.
_TYPE_TO_OSM: tuple[tuple[frozenset[str], str, str, str], ...] = (
  (frozenset({"cafe", "bakery", "coffee_shop"}), "amenity", "cafe", "food"),
  (frozenset({"restaurant", "meal_takeaway", "meal_delivery", "food"}), "amenity", "restaurant", "food"),
  (frozenset({"bar", "night_club"}), "amenity", "bar", "food"),
  (frozenset({"museum", "art_gallery"}), "tourism", "museum", "attraction"),
  (frozenset({"park", "national_park"}), "leisure", "park", "natural"),
  (frozenset({"lodging", "hotel", "hostel", "guest_house", "motel"}), "tourism", "hotel", "lodging"),
  (frozenset({"tourist_attraction", "landmark", "church", "place_of_worship", "aquarium", "zoo"}), "tourism", "attraction", "attraction"),
  (frozenset({"store", "book_store", "gift_shop", "shopping_mall"}), "shop", "gift", "commercial"),
  (frozenset({"route"}), "highway", "road", "highway"),
  (frozenset({"street_address", "premise", "subpremise"}), "building", "house", "building"),
)


def _geocode_result_is_poi(item: dict[str, Any]) -> bool:
  """Skip pure address/admin Geocoding hits — those should fall through to Places."""
  types = {str(t).lower() for t in (item.get("types") or [])}
  if not types:
    return True
  if types <= _GEOCODE_SKIP_TYPES:
    return False
  return True


def _api_key() -> str | None:
  return settings.google_maps_api_key()


def _http_get_json(url: str, *, timeout: int = 20) -> dict[str, Any] | None:
  req = urllib.request.Request(url, headers={"User-Agent": "social-media-travel-planner"})
  try:
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CONTEXT) as resp:
      return json.loads(resp.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
    logger.warning("google geocode GET failed: %s", exc)
    return None


def _http_post_json(
  url: str,
  body: dict[str, Any],
  *,
  headers: dict[str, str],
  timeout: int = 20,
) -> dict[str, Any] | None:
  data = json.dumps(body).encode("utf-8")
  req = urllib.request.Request(
    url,
    data=data,
    headers={"Content-Type": "application/json", **headers},
    method="POST",
  )
  try:
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CONTEXT) as resp:
      return json.loads(resp.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
    logger.warning("google places POST failed: %s", exc)
    return None


def _component(components: list[dict[str, Any]], *types: str) -> str | None:
  wanted = set(types)
  for part in components:
    part_types = set(part.get("types") or [])
    if part_types & wanted:
      return str(part.get("long_name") or part.get("longText") or "") or None
  return None


def _component_short(components: list[dict[str, Any]], *types: str) -> str | None:
  wanted = set(types)
  for part in components:
    part_types = set(part.get("types") or [])
    if part_types & wanted:
      return str(part.get("short_name") or part.get("shortText") or "") or None
  return None


def _map_types(types: list[str] | None) -> tuple[str | None, str | None, str | None]:
  type_set = {t.lower() for t in (types or [])}
  for matching, osm_class, osm_type, category in _TYPE_TO_OSM:
    if type_set & matching:
      return osm_class, osm_type, category
  if "point_of_interest" in type_set or "establishment" in type_set:
    return "amenity", "cafe", "food"  # soft food/POI prior; ranking still validates name
  return None, None, "commercial"


def _from_geocode_result(item: dict[str, Any], *, fallback_name: str) -> GeocodeResult | None:
  geometry = item.get("geometry") or {}
  location = geometry.get("location") or {}
  try:
    lat = float(location["lat"])
    lon = float(location["lng"])
  except (KeyError, TypeError, ValueError):
    return None
  components = item.get("address_components") or []
  types = [str(t) for t in (item.get("types") or [])]
  osm_class, osm_type, category = _map_types(types)
  name = fallback_name
  # Prefer a named POI over the full formatted address.
  for part in components:
    if "establishment" in (part.get("types") or []) or "point_of_interest" in (part.get("types") or []):
      name = str(part.get("long_name") or name)
      break
  country_code = _component_short(components, "country")
  return GeocodeResult(
    display_name=name,
    latitude=lat,
    longitude=lon,
    country=_component(components, "country"),
    country_code=country_code.upper() if country_code else None,
    state_province=_component(components, "administrative_area_level_1"),
    city=_component(
      components,
      "locality",
      "postal_town",
      "sublocality",
      "administrative_area_level_2",
    ),
    provider_place_id=str(item["place_id"]) if item.get("place_id") else None,
    category=category,
    provider="google",
    osm_class=osm_class,
    osm_type=osm_type,
    raw=item,
  )


def _from_places_result(item: dict[str, Any], *, fallback_name: str) -> GeocodeResult | None:
  loc = item.get("location") or {}
  try:
    lat = float(loc["latitude"])
    lon = float(loc["longitude"])
  except (KeyError, TypeError, ValueError):
    return None
  display = item.get("displayName") or {}
  name = str(display.get("text") or fallback_name).strip() or fallback_name
  types = [str(t) for t in (item.get("types") or [])]
  osm_class, osm_type, category = _map_types(types)
  formatted = str(item.get("formattedAddress") or item.get("shortFormattedAddress") or "")
  # Best-effort country from trailing address token.
  country = None
  country_code = None
  city = None
  if formatted:
    parts = [p.strip() for p in formatted.split(",") if p.strip()]
    if parts:
      country = parts[-1]
      if len(parts) >= 2:
        city = parts[-2]
  place_id = item.get("id")
  return GeocodeResult(
    display_name=name,
    latitude=lat,
    longitude=lon,
    country=country,
    country_code=country_code,
    state_province=None,
    city=city,
    provider_place_id=str(place_id) if place_id else None,
    category=category,
    provider="google",
    osm_class=osm_class,
    osm_type=osm_type,
    raw=item,
  )


def geocode_google(
  query: str,
  *,
  fallback_name: str = "",
  limit: int = _MAX_RESULTS,
  bias_lat: float | None = None,
  bias_lon: float | None = None,
  bias_radius_m: float = 40_000.0,
) -> list[GeocodeResult]:
  """One Geocoding call, then at most one Text Search if empty.

  Returns provider-neutral candidates. Empty when key missing or both APIs fail.
  """
  key = _api_key()
  if not key or not query.strip():
    return []

  name = fallback_name or query.split(",")[0].strip()
  results: list[GeocodeResult] = []

  params = urllib.parse.urlencode({"address": query, "key": key, "language": "en"})
  payload = _http_get_json(f"{_GEOCODE_URL}?{params}")
  if payload and payload.get("status") == "OK":
    for item in (payload.get("results") or [])[:limit]:
      if not _geocode_result_is_poi(item):
        continue
      mapped = _from_geocode_result(item, fallback_name=name)
      if mapped is not None:
        results.append(mapped)
  elif payload and payload.get("status") not in {None, "ZERO_RESULTS"}:
    logger.warning(
      "google geocode status=%s error=%s",
      payload.get("status"),
      payload.get("error_message"),
    )

  if results:
    logger.info("google geocode hits=%d query=%r", len(results), query)
    return results

  # Places Text Search — only when Geocoding found nothing (saves Pro SKU calls).
  body: dict[str, Any] = {
    "textQuery": query,
    "maxResultCount": max(1, min(limit, _MAX_RESULTS)),
    "languageCode": "en",
  }
  if bias_lat is not None and bias_lon is not None:
    body["locationBias"] = {
      "circle": {
        "center": {"latitude": bias_lat, "longitude": bias_lon},
        "radius": float(bias_radius_m),
      }
    }
  places_payload = _http_post_json(
    _TEXT_SEARCH_URL,
    body,
    headers={
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": _TEXT_SEARCH_FIELD_MASK,
    },
  )
  if not places_payload:
    return []
  for item in (places_payload.get("places") or [])[:limit]:
    mapped = _from_places_result(item, fallback_name=name)
    if mapped is not None:
      results.append(mapped)
  logger.info("google places text search hits=%d query=%r", len(results), query)
  return results


def google_fallback_query(
  place_name: str,
  *,
  city: str | None = None,
  country: str | None = None,
  category: str | None = None,
) -> str:
  """Single best query string — one Google call, not the full Nominatim ladder."""
  parts = [place_name.strip()]
  if category and category.lower() in {"cafe", "restaurant", "bar", "hotel", "museum", "market"}:
    parts.append(category.lower())
  if city:
    parts.append(city.strip())
  if country:
    parts.append(country.strip())
  return ", ".join(parts)
