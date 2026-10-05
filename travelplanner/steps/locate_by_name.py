from __future__ import annotations

import logging

from travelplanner.categories import category_from_osm
from travelplanner.flow.context import TimelineContext
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.flow.step import Step
from travelplanner.place_hints import PlaceMention
from travelplanner.places.mention_gate import locate_mention_for_library

logger = logging.getLogger(__name__)


def _passes_osm_travel_gate(location) -> bool:
  return category_from_osm(location.osm_class, location.osm_type) is not None


def locate_by_name(ctx: TimelineContext) -> TimelineContext:
  if not ctx.place_name:
    return ctx
  mention = PlaceMention(
    place_name=ctx.place_name,
    latitude=ctx.latitude,
    longitude=ctx.longitude,
    category=ctx.category,
  )
  ctx.mention = mention
  gated = locate_mention_for_library(mention)
  outcome = gated.outcome
  if outcome.status in {"unresolved", "rejected"} or outcome.location is None:
    ctx.locate_outcome = outcome
    return ctx
  if ctx.needs_osm_gate and not gated.jev_kept and not _passes_osm_travel_gate(outcome.location):
    ctx.locate_outcome = LocateOutcome(
      status="rejected",
      mention=mention,
      location=outcome.location,
      match_confidence=outcome.match_confidence,
      reason="OSM category not in travel gate",
    )
    return ctx
  ctx.locate_outcome = outcome
  logger.info(
    "locate_by_name %s place_name=%r confidence=%s",
    outcome.status,
    ctx.place_name,
    outcome.match_confidence,
  )
  return ctx


LOCATE_BY_NAME_STEP = Step(
  name="locate_by_name",
  run=locate_by_name,
)
