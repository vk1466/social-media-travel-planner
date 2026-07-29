"""Trip segmentation for Google Timeline clusters.

A place earns its spot in visit history mostly because of *when* it was
visited — on a trip away from home rather than during a Tuesday errand run.
Category cannot make that call: a holiday dinner and a drive-thru lunch are
both ``amenity=restaurant``. This module answers the timing question so the
import gate can weigh it alongside category and chain signals.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal, Protocol

from travelplanner.places.locate import haversine_meters
from travelplanner.settings import (
  timeline_day_trip_min_km,
  timeline_home_exclude_km,
  timeline_min_trip_days,
)

TravelKind = Literal["home", "local", "trip", "unknown"]

# Home search grid (~5.5 km per side at the equator) — wide enough to pool the
# separate errand pins of one metro area into a single bucket.
_HOME_GRID_DEGREES = 0.05
# Guardrails so an export covering only one holiday never nominates the
# destination as home.
_MIN_HOME_CLUSTERS = 20
_MIN_HOME_SHARE = 0.15
# A cluster spanning longer than this is a data artifact, not a single stay.
_MAX_CLUSTER_SPAN_DAYS = 30
# Tolerate one dark day inside a trip (a day Google recorded no visit).
_TRIP_GAP_DAYS = 1


class TimelineCluster(Protocol):
  """The cluster fields trip logic needs (see `import_visits.VisitCluster`)."""

  latitude: float
  longitude: float
  visited_from: str | None
  visited_to: str | None
  visit_count: int


@dataclass(frozen=True)
class TripWindow:
  """One run of consecutive days spent away from home."""

  start_date: str
  end_date: str
  day_count: int
  max_distance_km: float


@dataclass(frozen=True)
class TravelContext:
  """Whole-timeline view used to judge one cluster.

  Must be built from every cluster in the export, not a worker batch slice,
  or trips spanning a batch boundary get cut in half.
  """

  home_latitude: float | None = None
  home_longitude: float | None = None
  home_radius_km: float = 0.0
  day_trip_min_km: float = 0.0
  trips: tuple[TripWindow, ...] = ()
  home_inferred: bool = False

  @property
  def has_home(self) -> bool:
    return self.home_latitude is not None and self.home_longitude is not None

  def distance_km(self, latitude: float, longitude: float) -> float | None:
    if self.home_latitude is None or self.home_longitude is None:
      return None
    meters = haversine_meters(
      latitude,
      longitude,
      float(self.home_latitude),
      float(self.home_longitude),
    )
    return meters / 1000.0


def _valid_coords(latitude: float | None, longitude: float | None) -> bool:
  return (
    latitude is not None
    and longitude is not None
    and -90 <= latitude <= 90
    and -180 <= longitude <= 180
  )


def _parse_date(value: str | None) -> date | None:
  if not value:
    return None
  try:
    return date.fromisoformat(str(value)[:10])
  except ValueError:
    return None


def cluster_dates(cluster: TimelineCluster) -> tuple[str, ...]:
  """Every calendar day a cluster touches, as YYYY-MM-DD."""
  start = _parse_date(cluster.visited_from)
  end = _parse_date(cluster.visited_to)
  if start is None:
    start = end
  if start is None:
    return ()
  if end is None or end < start:
    end = start
  span = (end - start).days
  if span > _MAX_CLUSTER_SPAN_DAYS:
    return (start.isoformat(), end.isoformat())
  return tuple((start + timedelta(days=offset)).isoformat() for offset in range(span + 1))


def infer_home_location(
  clusters: Sequence[TimelineCluster],
) -> tuple[float, float] | None:
  """Guess home as the map cell the user returns to most.

  Returns None unless one cell clearly dominates a reasonably broad export,
  since a wrong guess would silently discard a whole trip.
  """
  usable = [c for c in clusters if _valid_coords(c.latitude, c.longitude)]
  if len(usable) < _MIN_HOME_CLUSTERS:
    return None

  buckets: dict[tuple[int, int], list[TimelineCluster]] = {}
  for cluster in usable:
    key = (
      int(cluster.latitude // _HOME_GRID_DEGREES),
      int(cluster.longitude // _HOME_GRID_DEGREES),
    )
    buckets.setdefault(key, []).append(cluster)

  def weight(group: Sequence[TimelineCluster]) -> int:
    return sum(max(1, int(c.visit_count or 1)) for c in group)

  total = sum(weight(group) for group in buckets.values())
  if total <= 0:
    return None
  winner = max(buckets.values(), key=weight)
  if weight(winner) / total < _MIN_HOME_SHARE:
    return None

  # Weighted centroid of the busiest cell.
  weights = [max(1, int(c.visit_count or 1)) for c in winner]
  total_weight = sum(weights)
  latitude = sum(c.latitude * w for c, w in zip(winner, weights)) / total_weight
  longitude = sum(c.longitude * w for c, w in zip(winner, weights)) / total_weight
  return latitude, longitude


def _away_days(
  clusters: Sequence[TimelineCluster],
  *,
  home_latitude: float,
  home_longitude: float,
  home_radius_km: float,
) -> dict[str, float]:
  """Map each away-from-home day to the furthest distance reached that day."""
  distances: dict[str, float] = {}
  for cluster in clusters:
    if not _valid_coords(cluster.latitude, cluster.longitude):
      continue
    km = haversine_meters(
      cluster.latitude,
      cluster.longitude,
      home_latitude,
      home_longitude,
    ) / 1000.0
    if km <= home_radius_km:
      continue
    for day in cluster_dates(cluster):
      if km > distances.get(day, 0.0):
        distances[day] = km
  return distances


def _segment_trips(
  away_days: dict[str, float],
  *,
  min_trip_days: int,
  day_trip_min_km: float,
) -> tuple[TripWindow, ...]:
  """Group away days into runs, keeping the runs that look like real trips."""
  if not away_days:
    return ()

  ordered = sorted(away_days)
  runs: list[list[str]] = [[ordered[0]]]
  for day in ordered[1:]:
    previous = date.fromisoformat(runs[-1][-1])
    current = date.fromisoformat(day)
    if (current - previous).days <= _TRIP_GAP_DAYS + 1:
      runs[-1].append(day)
    else:
      runs.append([day])

  trips: list[TripWindow] = []
  for run in runs:
    start = date.fromisoformat(run[0])
    end = date.fromisoformat(run[-1])
    day_count = (end - start).days + 1
    max_km = max(away_days[day] for day in run)
    if day_count < min_trip_days and max_km < day_trip_min_km:
      continue
    trips.append(
      TripWindow(
        start_date=run[0],
        end_date=run[-1],
        day_count=day_count,
        max_distance_km=max_km,
      )
    )
  return tuple(trips)


def build_travel_context(
  clusters: Sequence[TimelineCluster],
  *,
  home_latitude: float | None = None,
  home_longitude: float | None = None,
  home_radius_km: float | None = None,
  day_trip_min_km: float | None = None,
  min_trip_days: int | None = None,
) -> TravelContext:
  """Derive home + trip windows from every cluster in an export."""
  radius = home_radius_km if home_radius_km is not None else timeline_home_exclude_km()
  day_trip = day_trip_min_km if day_trip_min_km is not None else timeline_day_trip_min_km()
  min_days = min_trip_days if min_trip_days is not None else timeline_min_trip_days()

  inferred = False
  if not _valid_coords(home_latitude, home_longitude):
    guess = infer_home_location(clusters)
    if guess is None:
      return TravelContext(home_radius_km=radius, day_trip_min_km=day_trip)
    home_latitude, home_longitude = guess
    inferred = True

  trips = _segment_trips(
    _away_days(
      clusters,
      home_latitude=float(home_latitude),
      home_longitude=float(home_longitude),
      home_radius_km=radius,
    ),
    min_trip_days=min_days,
    day_trip_min_km=day_trip,
  )
  return TravelContext(
    home_latitude=float(home_latitude),
    home_longitude=float(home_longitude),
    home_radius_km=radius,
    day_trip_min_km=day_trip,
    trips=trips,
    home_inferred=inferred,
  )


def _in_trips(day: str, trips: Sequence[TripWindow]) -> bool:
  return any(trip.start_date <= day <= trip.end_date for trip in trips)


def classify_travel_context(
  cluster: TimelineCluster,
  context: TravelContext,
) -> TravelKind:
  """Where this cluster sits relative to home and known trips.

  home    — inside the everyday radius; never a travel place.
  trip    — during a trip, or far enough to be a day trip on its own.
  local   — outside the radius but on an ordinary day.
  unknown — no home reference, so timing cannot be judged.
  """
  if not context.has_home:
    return "unknown"
  distance = context.distance_km(cluster.latitude, cluster.longitude)
  if distance is None:
    return "unknown"
  if distance <= context.home_radius_km:
    return "home"
  if context.day_trip_min_km and distance >= context.day_trip_min_km:
    return "trip"
  days = cluster_dates(cluster)
  if not days:
    # No dates to place it in a trip; distance alone has to decide.
    return "local"
  if any(_in_trips(day, context.trips) for day in days):
    return "trip"
  return "local"
