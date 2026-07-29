"""Resolve Timeline visits via composable pipeline and create Visit records."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from travelplanner.categories import category_from_osm
from travelplanner.flow.context import TimelineContext
from travelplanner.flow.pipelines.dispatch import run_timeline_pipeline
from travelplanner.models import Place, PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import is_visitable_place, upsert_place
from travelplanner.places.locate import haversine_meters
from travelplanner.places.store import load_all_places, load_place
from travelplanner.settings import (
  timeline_max_places_per_call,
  timeline_routine_visit_count,
)
from travelplanner.timeline.chains import chain_brand
from travelplanner.timeline.parse import TimelineFormat, TimelineVisit
from travelplanner.timeline.semantic_types import (
  category_from_semantic_type,
  classify_semantic,
  is_food_semantic,
)
from travelplanner.timeline.skip_reason import SkipReason, classify_skip_reason
from travelplanner.timeline.llm_gate import (
  DESTINATION_CATEGORIES,
  needs_user_review,
  suggest_travel_place,
  suggest_unresolved_cluster,
)
from travelplanner.timeline.trips import (
  TravelContext,
  build_travel_context,
  classify_travel_context,
)
from travelplanner.visits import create_visit, visits_for_place

logger = logging.getLogger(__name__)

_CLUSTER_METERS = 75


@dataclass(frozen=True)
class ResolveOutcome:
  """Result of locating a Timeline cluster: a Place, or a classified skip."""

  place: Place | None = None
  skip_reason: SkipReason | None = None
  rejected_location: PlaceLocation | None = None


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
  skipped_local: int = 0
  skipped_chain: int = 0
  skipped_routine: int = 0
  skipped_errand: int = 0
  skipped_highway: int = 0
  skipped_address: int = 0
  skipped_parking: int = 0


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


def _place_for_unresolved_recovery(
  cluster: VisitCluster,
  *,
  location: PlaceLocation | None,
  category: str | None,
) -> Place | None:
  if location is not None:
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
  name = (cluster.place_name or cluster.address or "").strip()
  if not name:
    return None
  synthetic = PlaceLocation(
    display_name=name,
    latitude=cluster.latitude,
    longitude=cluster.longitude,
  )
  mention = PlaceMention(
    place_name=name,
    latitude=cluster.latitude,
    longitude=cluster.longitude,
    category=category,
  )
  place_id = upsert_place(mention, synthetic, source_post_id=None)
  return load_place(place_id)


def _resolve_cluster_place(
  cluster: VisitCluster,
  *,
  needs_osm_gate: bool,
  library: list[Place],
) -> ResolveOutcome:
  """Run the Timeline pipeline for one cluster."""
  category = category_from_semantic_type(cluster.semantic_type)
  ctx = TimelineContext(
    latitude=cluster.latitude,
    longitude=cluster.longitude,
    place_name=cluster.place_name,
    address=cluster.address,
    semantic_type=cluster.semantic_type,
    category=category,
    needs_osm_gate=needs_osm_gate,
    place_library=library,
  )
  result = run_timeline_pipeline(ctx)
  if result.failed_step is not None:
    raise RuntimeError(result.error_message or f"pipeline failed at {result.failed_step}")

  if ctx.place is not None:
    return ResolveOutcome(place=ctx.place)

  location = ctx.locate_outcome.location if ctx.locate_outcome else None
  reason = classify_skip_reason(
    location=location,
    place_name=cluster.place_name,
    address=cluster.address,
  )
  return ResolveOutcome(skip_reason=reason, rejected_location=location)


def _latest_visit_day(cluster: VisitCluster) -> str | None:
  return cluster.visited_to or cluster.visited_from


def _is_destination(place: Place) -> bool:
  if place.category in DESTINATION_CATEGORIES:
    return True
  return category_from_osm(place.location.osm_class, place.location.osm_type) in (
    DESTINATION_CATEGORIES
  )


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
  travel_context: TravelContext | None = None,
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

  context = travel_context or build_travel_context(
    work,
    home_latitude=home_latitude,
    home_longitude=home_longitude,
    home_radius_km=home_exclude_km,
  )
  routine_visits = timeline_routine_visit_count()

  limit = max_places if max_places is not None else timeline_max_places_per_call()
  skipped_limit = max(0, len(work) - limit)
  to_process = work[:limit]

  imported = 0
  queued_for_review = 0
  skipped_existing = 0
  skipped_unresolved = 0
  skipped_home = 0
  skipped_semantic = 0
  skipped_llm = 0
  skipped_local = 0
  skipped_chain = 0
  skipped_routine = 0
  skipped_errand = 0
  skipped_highway = 0
  skipped_address = 0
  skipped_parking = 0
  failed = 0
  place_names: list[str] = []
  library = load_all_places()

  def _count_resolve_skip(reason: SkipReason | None) -> None:
    nonlocal skipped_unresolved, skipped_errand, skipped_highway
    nonlocal skipped_address, skipped_parking
    if reason == "errand":
      skipped_errand += 1
    elif reason == "highway":
      skipped_highway += 1
    elif reason == "address":
      skipped_address += 1
    elif reason == "parking":
      skipped_parking += 1
    else:
      skipped_unresolved += 1

  def _handle_unresolved(cluster: VisitCluster, outcome: ResolveOutcome, travel_kind: str) -> None:
    nonlocal skipped_llm, skipped_unresolved, imported, queued_for_review, failed
    suggestion, reason = suggest_unresolved_cluster(
      place_name=cluster.place_name,
      address=cluster.address,
      latitude=cluster.latitude,
      longitude=cluster.longitude,
      travel_kind=travel_kind,
      visit_count=cluster.visit_count,
      semantic_type=cluster.semantic_type,
      location=outcome.rejected_location,
    )
    logger.info(
      "timeline unresolved llm suggestion=%s name=%r reason=%s",
      suggestion,
      cluster.place_name or (
        outcome.rejected_location.display_name if outcome.rejected_location else None
      ),
      reason,
    )
    if suggestion == "discard":
      skipped_llm += 1
      return

    category = category_from_semantic_type(cluster.semantic_type)
    place = _place_for_unresolved_recovery(
      cluster,
      location=outcome.rejected_location,
      category=category,
    )
    if place is None:
      skipped_unresolved += 1
      return
    if visits_for_place(user_id, place.place_id):
      return

    last_visited = _latest_visit_day(cluster)
    try:
      if suggestion == "keep":
        create_visit(
          user_id=user_id,
          place_id=place.place_id,
          visited_from=last_visited,
          visited_to=last_visited,
          notes=f"Imported from Google Maps Timeline (LLM keep: {reason})",
          source="timeline",
          status="confirmed",
        )
        imported += 1
      else:
        create_visit(
          user_id=user_id,
          place_id=place.place_id,
          visited_from=last_visited,
          visited_to=last_visited,
          source="timeline",
          status="needs_review",
          review_suggestion=suggestion,
          review_reason=reason,
          travel_kind=travel_kind,
        )
        queued_for_review += 1
    except Exception:
      logger.exception(
        "timeline unresolved llm create_visit failed place_id=%s",
        place.place_id,
      )
      failed += 1
      return
    place_names.append(place.display_name)

  for cluster in to_process:
    semantic_class = classify_semantic(cluster.semantic_type)
    if semantic_class == "block":
      skipped_semantic += 1
      continue

    travel_kind = classify_travel_context(cluster, context)
    if travel_kind == "home":
      skipped_home += 1
      continue

    if routine_visits and int(cluster.visit_count or 1) >= routine_visits:
      skipped_routine += 1
      continue

    needs_osm_gate = semantic_class == "unknown" or is_food_semantic(cluster.semantic_type)
    try:
      outcome = _resolve_cluster_place(cluster, needs_osm_gate=needs_osm_gate, library=library)
    except Exception:
      logger.exception(
        "timeline import resolve failed lat=%s lon=%s name=%r",
        cluster.latitude,
        cluster.longitude,
        cluster.place_name,
      )
      failed += 1
      continue

    place = outcome.place
    if place is None:
      reason = outcome.skip_reason or "unresolved"
      logger.info(
        "timeline resolve skip reason=%s name=%r lat=%s lon=%s",
        reason,
        cluster.place_name,
        cluster.latitude,
        cluster.longitude,
      )
      if reason == "unresolved":
        _handle_unresolved(cluster, outcome, travel_kind)
      else:
        _count_resolve_skip(reason)
      continue

    brand = chain_brand(place.display_name)
    if brand is not None:
      logger.info("timeline chain skip name=%r brand=%s", place.display_name, brand)
      skipped_chain += 1
      continue

    if travel_kind == "local" and not _is_destination(place):
      skipped_local += 1
      continue

    if visits_for_place(user_id, place.place_id):
      skipped_existing += 1
      continue

    try:
      last_visited = _latest_visit_day(cluster)
      if needs_user_review(place, travel_kind=travel_kind):
        suggestion, reason = suggest_travel_place(
          place,
          travel_kind=travel_kind,
          visit_count=cluster.visit_count,
        )
        create_visit(
          user_id=user_id,
          place_id=place.place_id,
          visited_from=last_visited,
          visited_to=last_visited,
          source="timeline",
          status="needs_review",
          review_suggestion=suggestion,
          review_reason=reason,
          travel_kind=travel_kind,
        )
        queued_for_review += 1
        place_names.append(place.display_name)
        continue

      create_visit(
        user_id=user_id,
        place_id=place.place_id,
        visited_from=last_visited,
        visited_to=last_visited,
        notes="Imported from Google Maps Timeline",
        source="timeline",
        status="confirmed",
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
    skipped_local=skipped_local,
    skipped_chain=skipped_chain,
    skipped_routine=skipped_routine,
    skipped_semantic=skipped_semantic,
    skipped_llm=skipped_llm,
    skipped_errand=skipped_errand,
    skipped_highway=skipped_highway,
    skipped_address=skipped_address,
    skipped_parking=skipped_parking,
    failed=failed,
    place_names=tuple(place_names),
  )
