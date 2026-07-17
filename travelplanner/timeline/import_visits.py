"""Resolve Timeline visits via OSM and create Visit records."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from travelplanner.clients import geocoder
from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import is_visitable_place, locate_mention, upsert_place
from travelplanner.places.constants import COUNTRY_CODE_TO_CONTINENT
from travelplanner.places.locate import haversine_meters
from travelplanner.places.store import load_place
from travelplanner.settings import timeline_import_max_places
from travelplanner.timeline.parse import TimelineFormat, TimelineVisit
from travelplanner.visits import create_visit, visits_for_place

logger = logging.getLogger(__name__)

# Cluster visits within this distance into one place (before reverse-geocode).
_CLUSTER_METERS = 75


def _place_location_from_geocode(result: GeocodeResult) -> PlaceLocation:
  return PlaceLocation(
    display_name=result.display_name,
    continent=COUNTRY_CODE_TO_CONTINENT.get(result.country_code) if result.country_code else None,
    country=result.country,
    country_code=result.country_code,
    state_province=result.state_province,
    city=result.city,
    latitude=result.latitude,
    longitude=result.longitude,
    provider_place_id=result.provider_place_id,
    osm_class=result.osm_class,
    osm_type=result.osm_type,
  )


@dataclass(frozen=True)
class _VisitCluster:
  latitude: float
  longitude: float
  visited_from: str | None
  visited_to: str | None
  place_name: str | None
  google_place_id: str | None
  address: str | None
  visit_count: int


@dataclass(frozen=True)
class TimelineImportResult:
  format: TimelineFormat
  visits_parsed: int
  unique_places: int
  imported: int
  skipped_existing: int
  skipped_unresolved: int
  skipped_limit: int
  failed: int
  place_names: tuple[str, ...]


def _cluster_key(visit: TimelineVisit) -> str:
  if visit.google_place_id:
    return f"g:{visit.google_place_id}"
  # ~100m grid when no Google place id
  return f"c:{visit.latitude:.3f},{visit.longitude:.3f}"


def _merge_dates(existing: str | None, incoming: str | None, *, prefer: str) -> str | None:
  if existing is None:
    return incoming
  if incoming is None:
    return existing
  if prefer == "min":
    return min(existing, incoming)
  return max(existing, incoming)


def cluster_timeline_visits(visits: list[TimelineVisit]) -> list[_VisitCluster]:
  """Collapse repeated visits to the same Google place / nearby pin."""
  buckets: dict[str, list[TimelineVisit]] = {}
  for visit in visits:
    buckets.setdefault(_cluster_key(visit), []).append(visit)

  clusters: list[_VisitCluster] = []
  for group in buckets.values():
    # Prefer a named visit when merging Takeout entries.
    named = next((item for item in group if item.place_name), group[0])
    lat = sum(item.latitude for item in group) / len(group)
    lng = sum(item.longitude for item in group) / len(group)
    visited_from: str | None = None
    visited_to: str | None = None
    for item in group:
      visited_from = _merge_dates(visited_from, item.visited_from, prefer="min")
      visited_to = _merge_dates(visited_to, item.visited_to or item.visited_from, prefer="max")
    clusters.append(
      _VisitCluster(
        latitude=lat,
        longitude=lng,
        visited_from=visited_from,
        visited_to=visited_to if visited_to != visited_from else visited_from,
        place_name=named.place_name,
        google_place_id=named.google_place_id,
        address=named.address,
        visit_count=len(group),
      )
    )

  # Secondary proximity merge for grid collisions with different place ids.
  merged: list[_VisitCluster] = []
  for cluster in sorted(clusters, key=lambda item: (item.visited_from or "", item.place_name or "")):
    mate_index = None
    for index, existing in enumerate(merged):
      if haversine_meters(
        cluster.latitude,
        cluster.longitude,
        existing.latitude,
        existing.longitude,
      ) <= _CLUSTER_METERS:
        mate_index = index
        break
    if mate_index is None:
      merged.append(cluster)
      continue
    existing = merged[mate_index]
    total = existing.visit_count + cluster.visit_count
    merged[mate_index] = _VisitCluster(
      latitude=(existing.latitude * existing.visit_count + cluster.latitude * cluster.visit_count)
      / total,
      longitude=(existing.longitude * existing.visit_count + cluster.longitude * cluster.visit_count)
      / total,
      visited_from=_merge_dates(existing.visited_from, cluster.visited_from, prefer="min"),
      visited_to=_merge_dates(
        existing.visited_to or existing.visited_from,
        cluster.visited_to or cluster.visited_from,
        prefer="max",
      ),
      place_name=existing.place_name or cluster.place_name,
      google_place_id=existing.google_place_id or cluster.google_place_id,
      address=existing.address or cluster.address,
      visit_count=total,
    )
  return merged


def _resolve_cluster_place(cluster: _VisitCluster):
  """Locate + upsert a library place for one visit cluster."""
  if cluster.place_name:
    mention = PlaceMention(
      place_name=cluster.place_name,
      latitude=cluster.latitude,
      longitude=cluster.longitude,
    )
    location = locate_mention(mention)
    if location is not None and is_visitable_place(location):
      place_id = upsert_place(mention, location, source_post_id=None)
      return load_place(place_id)

  result = geocoder.reverse_geocode_normalized(
    cluster.latitude,
    cluster.longitude,
    fallback_name=cluster.place_name or cluster.address or "",
  )
  if result is None:
    return None
  location = _place_location_from_geocode(result)
  if not is_visitable_place(location):
    return None
  mention = PlaceMention(
    place_name=location.display_name,
    city=location.city,
    country=location.country,
    state_province=location.state_province,
    latitude=location.latitude,
    longitude=location.longitude,
  )
  place_id = upsert_place(mention, location, source_post_id=None)
  return load_place(place_id)


def import_timeline_visits(
  visits: list[TimelineVisit],
  *,
  user_id: str,
  source_format: TimelineFormat,
  max_places: int | None = None,
) -> TimelineImportResult:
  """Reverse-geocode clustered Timeline visits and create Visit rows."""
  if not user_id:
    raise ValueError("user_id is required")

  limit = max_places if max_places is not None else timeline_import_max_places()
  clusters = cluster_timeline_visits(visits)
  skipped_limit = max(0, len(clusters) - limit)
  to_process = clusters[:limit]

  imported = 0
  skipped_existing = 0
  skipped_unresolved = 0
  failed = 0
  place_names: list[str] = []

  for cluster in to_process:
    try:
      place = _resolve_cluster_place(cluster)
    except Exception:
      logger.exception(
        "timeline import resolve failed lat=%s lon=%s name=%r",
        cluster.latitude,
        cluster.longitude,
        cluster.place_name,
      )
      failed += 1
      continue

    if place is None:
      skipped_unresolved += 1
      continue

    if visits_for_place(user_id, place.place_id):
      skipped_existing += 1
      continue

    try:
      create_visit(
        user_id=user_id,
        place_id=place.place_id,
        visited_from=cluster.visited_from,
        visited_to=cluster.visited_to,
        notes="Imported from Google Maps Timeline",
      )
    except Exception:
      logger.exception("timeline import create_visit failed place_id=%s", place.place_id)
      failed += 1
      continue

    imported += 1
    place_names.append(place.display_name)

  return TimelineImportResult(
    format=source_format,
    visits_parsed=len(visits),
    unique_places=len(clusters),
    imported=imported,
    skipped_existing=skipped_existing,
    skipped_unresolved=skipped_unresolved,
    skipped_limit=skipped_limit,
    failed=failed,
    place_names=tuple(place_names),
  )
