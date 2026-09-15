"""OSRM (Open Source Routing Machine) client for road accessibility and snapping."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import logging
from typing import Any, Optional
import httpx

logger = logging.getLogger(__name__)

DEFAULT_OSRM_URL = "https://router.project-osrm.org"
DEFAULT_MAX_ROAD_DISTANCE_METERS = 1500.0
DEFAULT_TIMEOUT_SECONDS = 3.5


@dataclass
class OsrmNearestResult:
  """Result of an OSRM nearest road lookup."""

  has_road: bool
  distance_meters: Optional[float] = None
  snapped_latitude: Optional[float] = None
  snapped_longitude: Optional[float] = None
  road_name: Optional[str] = None
  error: Optional[str] = None

  def to_dict(self) -> dict[str, Any]:
    return asdict(self)


def check_nearest_road(
  latitude: float,
  longitude: float,
  profile: str = "driving",
  max_distance_meters: float = DEFAULT_MAX_ROAD_DISTANCE_METERS,
  base_url: str = DEFAULT_OSRM_URL,
  timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
  http_client: Optional[httpx.Client] = None,
) -> OsrmNearestResult:
  """Checks if a coordinate is within `max_distance_meters` of a drivable road.

  Args:
    latitude: Latitude of the point.
    longitude: Longitude of the point.
    profile: OSRM routing profile ('driving', 'walking', 'cycling').
    max_distance_meters: Maximum acceptable distance to the nearest road.
    base_url: OSRM service base URL.
    timeout_seconds: Request timeout in seconds.
    http_client: Optional httpx.Client to reuse connections.

  Returns:
    OsrmNearestResult with road accessibility status and distance.
  """
  # OSRM coordinate format is {longitude},{latitude}
  url = f"{base_url.rstrip('/')}/nearest/v1/{profile}/{longitude:.6f},{latitude:.6f}?number=1"

  should_close = False
  if http_client is None:
    http_client = httpx.Client(timeout=timeout_seconds)
    should_close = True

  try:
    response = http_client.get(url)
    if response.status_code != 200:
      logger.warning("OSRM nearest returned status %s for (%s, %s)", response.status_code, latitude, longitude)
      return OsrmNearestResult(
        has_road=True,  # Default to True on server error to avoid dropping valid stops
        error=f"OSRM returned HTTP {response.status_code}",
      )

    data = response.json()
    if data.get("code") != "Ok" or not data.get("waypoints"):
      return OsrmNearestResult(
        has_road=False,
        error=data.get("message") or "No road found nearby",
      )

    wp = data["waypoints"][0]
    distance = float(wp.get("distance", 0.0))
    location = wp.get("location") or []
    snapped_lon = float(location[0]) if len(location) >= 2 else None
    snapped_lat = float(location[1]) if len(location) >= 2 else None
    road_name = wp.get("name") or None

    is_accessible = distance <= max_distance_meters
    return OsrmNearestResult(
      has_road=is_accessible,
      distance_meters=round(distance, 1),
      snapped_latitude=snapped_lat,
      snapped_longitude=snapped_lon,
      road_name=road_name,
    )

  except Exception as exc:
    logger.warning("OSRM nearest check failed for (%s, %s): %s", latitude, longitude, exc)
    # Fail open: if OSRM is unreachable, treat point as having road access so route still completes
    return OsrmNearestResult(
      has_road=True,
      error=str(exc),
    )
  finally:
    if should_close:
      http_client.close()


def filter_stops_by_road_access(
  stops: list[Any],
  profile: str = "driving",
  max_distance_meters: float = DEFAULT_MAX_ROAD_DISTANCE_METERS,
  base_url: str = DEFAULT_OSRM_URL,
  timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> tuple[list[Any], list[dict[str, Any]]]:
  """Filters a list of stops, separating off-road coordinates into excluded_stops.

  Returns:
    (accessible_stops, excluded_stops)
  """
  accessible_stops: list[Any] = []
  excluded_stops: list[dict[str, Any]] = []

  with httpx.Client(timeout=timeout_seconds) as client:
    for stop in stops:
      lat = getattr(stop, "latitude", None)
      lon = getattr(stop, "longitude", None)
      if lat is None or lon is None:
        continue

      res = check_nearest_road(
        latitude=lat,
        longitude=lon,
        profile=profile,
        max_distance_meters=max_distance_meters,
        base_url=base_url,
        timeout_seconds=timeout_seconds,
        http_client=client,
      )

      if res.has_road:
        # If snapped coords exist, we can optionally attach them
        if hasattr(stop, "snapped_latitude") and res.snapped_latitude is not None:
          stop.snapped_latitude = res.snapped_latitude
          stop.snapped_longitude = res.snapped_longitude
          stop.road_distance_meters = res.distance_meters
        accessible_stops.append(stop)
      else:
        dist_str = f"{res.distance_meters}m" if res.distance_meters is not None else "far"
        if res.distance_meters and res.distance_meters >= 1000:
          dist_str = f"{(res.distance_meters / 1000):.1f}km"

        reason = (
          f"No drivable road within {int(max_distance_meters)}m "
          f"(nearest road is {dist_str} away)"
          if res.distance_meters is not None
          else (res.error or "No drivable road found nearby")
        )
        excluded_stops.append(
          {
            "stop_id": getattr(stop, "stop_id", "stop"),
            "name": getattr(stop, "name", "Unnamed Stop"),
            "latitude": lat,
            "longitude": lon,
            "reason": reason,
            "road_distance_meters": res.distance_meters,
          }
        )

  return accessible_stops, excluded_stops
