"""Nearby travel POI lookup via Overpass (when reverse-geocode is a house/parking)."""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from travelplanner.clients.geocoder import GeocodeResult

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
_MIN_DELAY_SECONDS = 1.0
_last_call_at = 0.0

# Prefer named travel-ish OSM tags near a noisy Timeline pin.
_OVERPASS_QUERY = """
[out:json][timeout:20];
(
  nwr(around:{radius},{lat},{lon})["tourism"];
  nwr(around:{radius},{lat},{lon})["historic"];
  nwr(around:{radius},{lat},{lon})["leisure"~"^(park|nature_reserve|garden|beach_resort)$"];
  nwr(around:{radius},{lat},{lon})["natural"~"^(peak|beach|waterfall|cliff|volcano|ridge|saddle)$"];
  nwr(around:{radius},{lat},{lon})["amenity"~"^(restaurant|cafe|bar|pub|place_of_worship|ferry_terminal)$"];
  nwr(around:{radius},{lat},{lon})["highway"~"^(path|footway|steps|bridleway)$"]["name"];
  nwr(around:{radius},{lat},{lon})["craft"="brewery"];
);
out center tags 15;
"""


def _throttle() -> None:
  global _last_call_at
  elapsed = time.monotonic() - _last_call_at
  if elapsed < _MIN_DELAY_SECONDS:
    time.sleep(_MIN_DELAY_SECONDS - elapsed)
  _last_call_at = time.monotonic()


def _element_coords(element: dict[str, Any]) -> tuple[float, float] | None:
  if "lat" in element and "lon" in element:
    return float(element["lat"]), float(element["lon"])
  center = element.get("center")
  if isinstance(center, dict) and "lat" in center and "lon" in center:
    return float(center["lat"]), float(center["lon"])
  return None


def _osm_class_type(tags: dict[str, Any]) -> tuple[str | None, str | None]:
  for key in (
    "tourism",
    "historic",
    "leisure",
    "natural",
    "amenity",
    "craft",
    "highway",
  ):
    value = tags.get(key)
    if isinstance(value, str) and value.strip():
      return key, value.strip()
  return None, None


def _display_name(tags: dict[str, Any]) -> str | None:
  for key in ("name", "name:en", "brand", "operator"):
    value = tags.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return None


def _from_overpass_element(element: dict[str, Any]) -> GeocodeResult | None:
  tags = element.get("tags")
  if not isinstance(tags, dict):
    return None
  name = _display_name(tags)
  if not name:
    return None
  coords = _element_coords(element)
  if coords is None:
    return None
  lat, lon = coords
  osm_class, osm_type = _osm_class_type(tags)
  osm_id = element.get("id")
  osm_kind = element.get("type")  # node/way/relation
  provider_place_id = f"overpass:{osm_kind}:{osm_id}" if osm_id is not None else None
  return GeocodeResult(
    display_name=name,
    latitude=lat,
    longitude=lon,
    country=None,
    country_code=None,
    state_province=None,
    city=None,
    provider_place_id=provider_place_id,
    category=None,
    provider="overpass",
    osm_class=osm_class,
    osm_type=osm_type,
    raw=element,
  )


def search_nearby_travel_pois(
  latitude: float,
  longitude: float,
  *,
  radius_m: int = 150,
  limit: int = 8,
) -> list[GeocodeResult]:
  """Find named travel-ish OSM features near a coordinate (Overpass)."""
  query = _OVERPASS_QUERY.format(
    radius=max(50, min(int(radius_m), 500)),
    lat=latitude,
    lon=longitude,
  )
  _throttle()
  body = urllib.parse.urlencode({"data": query}).encode("utf-8")
  request = urllib.request.Request(
    OVERPASS_URL,
    data=body,
    headers={"User-Agent": "social-media-travel-planner (timeline nearby)"},
    method="POST",
  )
  try:
    with urllib.request.urlopen(request, timeout=25) as response:
      payload = json.loads(response.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
    logger.warning("overpass nearby failed lat=%s lon=%s error=%s", latitude, longitude, exc)
    return []

  elements = payload.get("elements") if isinstance(payload, dict) else None
  if not isinstance(elements, list):
    return []

  results: list[GeocodeResult] = []
  seen: set[str] = set()
  for element in elements:
    if not isinstance(element, dict):
      continue
    hit = _from_overpass_element(element)
    if hit is None:
      continue
    key = hit.provider_place_id or f"{hit.display_name}:{hit.latitude}:{hit.longitude}"
    if key in seen:
      continue
    seen.add(key)
    results.append(hit)
    if len(results) >= max(1, limit):
      break
  return results
