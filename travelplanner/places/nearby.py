"""Keep places that sit in the searched city or a day trip away."""

from __future__ import annotations

import math

from travelplanner.models import Place

_EARTH_RADIUS_M = 6_371_000


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  phi1, phi2 = math.radians(lat1), math.radians(lat2)
  dphi = math.radians(lat2 - lat1)
  dlambda = math.radians(lon2 - lon1)
  a = (
    math.sin(dphi / 2) ** 2
    + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
  )
  return 2 * _EARTH_RADIUS_M * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def place_is_nearby(
  place: Place,
  *,
  latitude: float,
  longitude: float,
  radius_km: float,
) -> bool:
  """True when the place pin is within radius_km of the city center."""
  loc = place.location
  if loc.latitude is None or loc.longitude is None:
    return False
  meters = _distance_meters(
    latitude,
    longitude,
    loc.latitude,
    loc.longitude,
  )
  return meters <= radius_km * 1000
