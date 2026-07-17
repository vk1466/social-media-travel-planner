"""Resolve Timeline visits via OSM and create Visit records."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from travelplanner.categories import category_from_osm
from travelplanner.clients import geocoder
from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.models import Place, PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import is_visitable_place, locate_mention, upsert_place
from travelplanner.places.constants import COUNTRY_CODE_TO_CONTINENT
from travelplanner.places.locate import haversine_meters
from travelplanner.places.store import load_place
from travelplanner.settings import timeline_home_exclude_km, timeline_max_places_per_call
from travelplanner.timeline.parse import TimelineFormat, TimelineVisit
from travelplanner.timeline.semantic_types import (
  category_from_semantic_type,
  classify_semantic,
)
from travelplanner.timeline.llm_gate import needs_user_review, suggest_travel_place
from travelplanner.clients.overpass import search_nearby_travel_pois
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
class VisitCluster:
  """Public cluster shape (also used when client pre-clusters)."""

  latitude: float
  longitude: float
  visited_from: str | None
  visited_to: str | None
  place_name: str | None
  google_place_id: str | None
  address: str | None
  visit_count: int
  semantic_type: str | None = None


@dataclass(frozen=True)
class TimelineImportResult:
  format: TimelineFormat
  visits_parsed: int
  unique_places: int
  imported: int
  queued_for_review: int
  skipped_existing: int
  skipped_unresolved: int
  skipped_limit: int
  skipped_home: int
  skipped_semantic: int
  skipped_llm: int
  failed: int
  place_names: tuple[str, ...]


def _cluster_key(visit: TimelineVisit) -> str:
  if visit.google_place_id:
    return f"g:{visit.google_place_id}"
  return f"c:{visit.latitude:.3f},{visit.longitude:.3f}"


def _merge_dates(existing: str | None, incoming: str | None, *, prefer: str) -> str | None:
  if existing is None:
    return incoming
  if incoming is None:
    return existing
  if prefer == "min":
    return min(existing, incoming)
  return max(existing, incoming)


def cluster_timeline_visits(visits: list[TimelineVisit]) -> list[VisitCluster]:
  """Collapse repeated visits to the same Google place / nearby pin."""
  buckets: dict[str, list[TimelineVisit]] = {}
  for visit in visits:
    buckets.setdefault(_cluster_key(visit), []).append(visit)

  clusters: list[VisitCluster] = []
  for group in buckets.values():
    named = next((item for item in group if item.place_name), group[0])
    typed = next((item for item in group if item.semantic_type), named)
    lat = sum(item.latitude for item in group) / len(group)
    lng = sum(item.longitude for item in group) / len(group)
    visited_from: str | None = None
    visited_to: str | None = None
    for item in group:
      visited_from = _merge_dates(visited_from, item.visited_from, prefer="min")
      visited_to = _merge_dates(visited_to, item.visited_to or item.visited_from, prefer="max")
    clusters.append(
      VisitCluster(
        latitude=lat,
        longitude=lng,
        visited_from=visited_from,
        visited_to=visited_to if visited_to != visited_from else visited_from,
        place_name=named.place_name,
        google_place_id=named.google_place_id,
        address=named.address,
        visit_count=len(group),
        semantic_type=typed.semantic_type,
      )
    )

  merged: list[VisitCluster] = []
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
    merged[mate_index] = VisitCluster(
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
      semantic_type=existing.semantic_type or cluster.semantic_type,
    )
  return merged


def clusters_from_dicts(rows: list[dict]) -> list[VisitCluster]:
  """Build clusters from client- or S3-staged JSON rows."""
  clusters: list[VisitCluster] = []
  for row in rows:
    try:
      lat = float(row["latitude"])
      lng = float(row["longitude"])
    except (KeyError, TypeError, ValueError):
      continue
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
      continue
    clusters.append(
      VisitCluster(
        latitude=lat,
        longitude=lng,
        visited_from=row.get("visited_from"),
        visited_to=row.get("visited_to"),
        place_name=row.get("place_name"),
        google_place_id=row.get("google_place_id"),
        address=row.get("address"),
        visit_count=max(1, int(row.get("visit_count") or 1)),
        semantic_type=row.get("semantic_type"),
      )
    )
  return clusters


def _passes_osm_travel_gate(location: PlaceLocation) -> bool:
  """True when OSM maps to a known travel category (Stage 2 for TYPE_UNKNOWN)."""
  return category_from_osm(location.osm_class, location.osm_type) is not None


def _upsert_from_location(
  location: PlaceLocation,
  *,
  category: str | None,
  cluster: VisitCluster,
) -> Place | None:
  mention = PlaceMention(
    place_name=location.display_name or cluster.place_name or cluster.address or "Timeline place",
    city=location.city,
    country=location.country,
    state_province=location.state_province,
    latitude=location.latitude if location.latitude is not None else cluster.latitude,
    longitude=location.longitude if location.longitude is not None else cluster.longitude,
    category=category,
  )
  place_id = upsert_place(mention, location, source_post_id=None)
  return load_place(place_id)


def _try_nearby_pois(
  cluster: VisitCluster,
  *,
  needs_osm_gate: bool,
  category: str | None,
) -> Place | None:
  """When reverse-geocode is a house/parking, look for a real travel POI nearby."""
  candidates = search_nearby_travel_pois(
    cluster.latitude,
    cluster.longitude,
    radius_m=150,
    limit=8,
  )
  for result in candidates:
    location = _place_location_from_geocode(result)
    if not is_visitable_place(location):
      continue
    if needs_osm_gate and not _passes_osm_travel_gate(location):
      continue
    place = _upsert_from_location(location, category=category, cluster=cluster)
    if place is not None:
      logger.info(
        "timeline nearby fallback lat=%s lon=%s → %r",
        cluster.latitude,
        cluster.longitude,
        place.display_name,
      )
      return place
  return None


def _resolve_cluster_place(
  cluster: VisitCluster,
  *,
  needs_osm_gate: bool,
) -> Place | None:
  """Locate + upsert a library place for one visit cluster."""
  category = category_from_semantic_type(cluster.semantic_type)

  if cluster.place_name:
    mention = PlaceMention(
      place_name=cluster.place_name,
      latitude=cluster.latitude,
      longitude=cluster.longitude,
      category=category,
    )
    location = locate_mention(mention)
    if location is not None and is_visitable_place(location):
      if not (needs_osm_gate and not _passes_osm_travel_gate(location)):
        place_id = upsert_place(mention, location, source_post_id=None)
        return load_place(place_id)

  result = geocoder.reverse_geocode_normalized(
    cluster.latitude,
    cluster.longitude,
    fallback_name=cluster.place_name or cluster.address or "",
  )
  if result is not None:
    location = _place_location_from_geocode(result)
    if is_visitable_place(location):
      if not (needs_osm_gate and not _passes_osm_travel_gate(location)):
        return _upsert_from_location(location, category=category, cluster=cluster)

  # House / parking / street pin → try nearby named travel POIs.
  return _try_nearby_pois(cluster, needs_osm_gate=needs_osm_gate, category=category)


def _review_notes(suggestion: str, reason: str) -> str:
  return f"Timeline review · suggest={suggestion} · {reason}".strip()


def import_timeline_visits(
  visits: list[TimelineVisit] | None = None,
  *,
  user_id: str,
  source_format: TimelineFormat,
  clusters: list[VisitCluster] | None = None,
  home_latitude: float | None = None,
  home_longitude: float | None = None,
  home_exclude_km: float | None = None,
  max_places: int | None = None,
) -> TimelineImportResult:
  """Filter + resolve Timeline clusters; auto-save clear travel, queue ambiguous."""
  if not user_id:
    raise ValueError("user_id is required")

  if clusters is not None:
    work = list(clusters)
    raw_count = sum(max(1, c.visit_count) for c in work)
  elif visits is not None:
    work = cluster_timeline_visits(visits)
    raw_count = len(visits)
  else:
    raise ValueError("visits or clusters is required")

  exclude_km = home_exclude_km if home_exclude_km is not None else timeline_home_exclude_km()
  exclude_meters = exclude_km * 1000.0
  has_home = (
    home_latitude is not None
    and home_longitude is not None
    and -90 <= home_latitude <= 90
    and -180 <= home_longitude <= 180
  )

  limit = max_places if max_places is not None else timeline_max_places_per_call()
  skipped_limit = max(0, len(work) - limit)
  to_process = work[:limit]

  imported = 0
  queued_for_review = 0
  skipped_existing = 0
  skipped_unresolved = 0
  skipped_home = 0
  skipped_semantic = 0
  skipped_llm = 0  # retained for job summary compat; no longer auto-drops
  failed = 0
  place_names: list[str] = []

  for cluster in to_process:
    semantic_class = classify_semantic(cluster.semantic_type)
    if semantic_class == "block":
      skipped_semantic += 1
      continue

    if has_home:
      distance = haversine_meters(
        cluster.latitude,
        cluster.longitude,
        float(home_latitude),
        float(home_longitude),
      )
      if distance <= exclude_meters:
        skipped_home += 1
        continue

    needs_osm_gate = semantic_class == "unknown"
    try:
      place = _resolve_cluster_place(cluster, needs_osm_gate=needs_osm_gate)
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

    # Confirmed visits + pending reviews both count as "already have this place".
    if visits_for_place(user_id, place.place_id):
      skipped_existing += 1
      continue

    try:
      if needs_user_review(place):
        suggestion, reason = suggest_travel_place(place)
        create_visit(
          user_id=user_id,
          place_id=place.place_id,
          visited_from=cluster.visited_from,
          visited_to=cluster.visited_to,
          notes=_review_notes(suggestion, reason),
          source="timeline_review",
        )
        queued_for_review += 1
        place_names.append(place.display_name)
        continue

      create_visit(
        user_id=user_id,
        place_id=place.place_id,
        visited_from=cluster.visited_from,
        visited_to=cluster.visited_to,
        notes="Imported from Google Maps Timeline",
        source="timeline",
      )
    except Exception:
      logger.exception("timeline import create_visit failed place_id=%s", place.place_id)
      failed += 1
      continue

    imported += 1
    place_names.append(place.display_name)

  return TimelineImportResult(
    format=source_format,
    visits_parsed=raw_count,
    unique_places=len(work),
    imported=imported,
    queued_for_review=queued_for_review,
    skipped_existing=skipped_existing,
    skipped_unresolved=skipped_unresolved,
    skipped_limit=skipped_limit,
    skipped_home=skipped_home,
    skipped_semantic=skipped_semantic,
    skipped_llm=skipped_llm,
    failed=failed,
    place_names=tuple(place_names),
  )
