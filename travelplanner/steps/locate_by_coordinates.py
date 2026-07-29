from __future__ import annotations

import logging

from travelplanner.categories import category_from_osm
from travelplanner.clients import geocoder
from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.flow.context import TimelineContext
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.flow.step import Step
from travelplanner.place_hints import PlaceMention
from travelplanner.places.locate import location_from_geocode
from travelplanner.places.store import is_visitable_place

logger = logging.getLogger(__name__)


def _passes_osm_travel_gate(location) -> bool:
  return category_from_osm(location.osm_class, location.osm_type) is not None


def locate_by_coordinates(ctx: TimelineContext) -> TimelineContext:
  if ctx.locate_outcome is not None and ctx.locate_outcome.status in {
    "resolved",
    "low_confidence",
  }:
    return ctx

  fallback_name = ctx.place_name or ctx.address or "Timeline place"
  mention = PlaceMention(
    place_name=fallback_name,
    latitude=ctx.latitude,
    longitude=ctx.longitude,
    category=ctx.category,
  )
  ctx.mention = mention

  result = geocoder.reverse_geocode_normalized(
    ctx.latitude,
    ctx.longitude,
    fallback_name=fallback_name,
  )
  if result is None:
    ctx.locate_outcome = LocateOutcome(
      status="unresolved",
      mention=mention,
      reason="reverse geocode returned no result",
    )
    return ctx

  location = location_from_geocode(result)
  if not is_visitable_place(location):
    ctx.locate_outcome = LocateOutcome(
      status="rejected",
      mention=mention,
      location=location,
      reason="non-travel OSM match",
    )
    return ctx
  if ctx.needs_osm_gate and not _passes_osm_travel_gate(location):
    ctx.locate_outcome = LocateOutcome(
      status="rejected",
      mention=mention,
      location=location,
      reason="OSM category not in travel gate",
    )
    return ctx

  ctx.locate_outcome = LocateOutcome(
    status="resolved",
    mention=mention,
    location=location,
  )
  logger.info(
    "locate_by_coordinates resolved display=%r lat=%s lon=%s",
    location.display_name,
    ctx.latitude,
    ctx.longitude,
  )
  return ctx


LOCATE_BY_COORDINATES_STEP = Step(
  name="locate_by_coordinates",
  run=locate_by_coordinates,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
