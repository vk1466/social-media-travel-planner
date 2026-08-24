"""Build Google Maps search URLs from stored place fields (no Maps API call)."""

from __future__ import annotations

from dataclasses import replace
from urllib.parse import quote, urlencode

from travelplanner.models import Place, PlaceLocation

_MAPS_SEARCH = "https://www.google.com/maps/search/"


def _is_google_place_id(provider_place_id: str | None) -> bool:
  """Google Place IDs are ChIJ… / similar tokens, not OSM numeric or overpass: ids."""
  if not provider_place_id:
    return False
  token = provider_place_id.strip()
  if token.startswith("overpass:"):
    return False
  if token.isdigit():
    return False
  return token.startswith("ChIJ") or token.startswith("GhIJ")


def _location_query(location: PlaceLocation) -> str:
  return ", ".join(
    part
    for part in (
      location.display_name,
      location.city,
      location.state_province,
      location.country,
    )
    if part and str(part).strip()
  )


def google_maps_url_for_location(location: PlaceLocation) -> str | None:
  """Name + city/region/country; pin with query_place_id when we have a Google id."""
  query = _location_query(location)
  if not query:
    lat, lng = location.latitude, location.longitude
    if lat is not None and lng is not None:
      query = f"{lat},{lng}"
    else:
      return None

  params: dict[str, str] = {"api": "1", "query": query}
  if _is_google_place_id(location.provider_place_id):
    params["query_place_id"] = location.provider_place_id.strip()
  return f"{_MAPS_SEARCH}?{urlencode(params, quote_via=quote)}"


def with_google_maps_url(place: Place) -> Place:
  url = google_maps_url_for_location(place.location)
  if place.google_maps_url == url:
    return place
  return replace(place, google_maps_url=url)
