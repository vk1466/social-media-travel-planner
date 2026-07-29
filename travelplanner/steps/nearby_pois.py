from __future__ import annotations

import logging

from travelplanner.categories import category_from_osm
from travelplanner.clients.overpass import search_nearby_travel_pois
from travelplanner.flow.context import TimelineContext
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.flow.step import Step
from travelplanner.place_hints import PlaceMention
from travelplanner.places.locate import location_from_geocode
from travelplanner.places.store import is_visitable_place

logger = logging.getLogger(__name__)


def _passes_osm_travel_gate(location) -> bool:
  return category_from_osm(location.osm_class, location.osm_type) is not None


def nearby_pois(ctx: TimelineContext) -> TimelineContext:
  if ctx.locate_outcome is not None and ctx.locate_outcome.status in {
    "resolved",
    "low_confidence",
  }:
    return ctx

  candidates = search_nearby_travel_pois(
    ctx.latitude,
    ctx.longitude,
    radius_m=150,
    limit=8,
  )
  ctx.nearby_results = list(candidates)

  fallback_name = ctx.place_name or ctx.address or "Timeline place"
  for result in candidates:
    location = location_from_geocode(result)
    if not is_visitable_place(location):
      continue
    if ctx.needs_osm_gate and not _passes_osm_travel_gate(location):
      continue
    mention = PlaceMention(
      place_name=location.display_name or fallback_name,
      city=location.city,
      country=location.country,
      state_province=location.state_province,
      latitude=location.latitude if location.latitude is not None else ctx.latitude,
      longitude=location.longitude if location.longitude is not None else ctx.longitude,
      category=ctx.category,
    )
    ctx.mention = mention
    ctx.locate_outcome = LocateOutcome(
      status="resolved",
      mention=mention,
      location=location,
    )
    logger.info(
      "nearby_pois resolved display=%r lat=%s lon=%s",
      location.display_name,
      ctx.latitude,
      ctx.longitude,
    )
    return ctx

  if ctx.locate_outcome is None:
    ctx.locate_outcome = LocateOutcome(
      status="unresolved",
      mention=ctx.mention,
      reason="no nearby travel POI",
    )
  return ctx


NEARBY_POIS_STEP = Step(
  name="nearby_pois",
  run=nearby_pois,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
