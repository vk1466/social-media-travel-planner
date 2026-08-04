from __future__ import annotations

import logging

from travelplanner.categories import category_from_osm
from travelplanner.flow.context import TimelineContext
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.flow.step import Step
from travelplanner.place_hints import PlaceMention
from travelplanner.places.locate import locate_mention_debug
from travelplanner.places.shop_travel_gate import llm_ambiguous_shop_is_travel
from travelplanner.places.store import is_ambiguous_shop, is_visitable_place

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
  debug = locate_mention_debug(mention)
  if debug.location is None or debug.status == "unresolved":
    ctx.locate_outcome = LocateOutcome(
      status="unresolved",
      mention=mention,
      location=debug.location,
      match_confidence=debug.match_confidence,
      reason="; ".join(debug.notes[-3:]) if debug.notes else None,
    )
    return ctx
  if not is_visitable_place(debug.location):
    if is_ambiguous_shop(debug.location):
      keep, gate_reason = llm_ambiguous_shop_is_travel(debug.location, mention)
      if not keep:
        ctx.locate_outcome = LocateOutcome(
          status="rejected",
          mention=mention,
          location=debug.location,
          match_confidence=debug.match_confidence,
          reason=f"ambiguous shop rejected: {gate_reason}",
        )
        return ctx
    else:
      ctx.locate_outcome = LocateOutcome(
        status="rejected",
        mention=mention,
        location=debug.location,
        match_confidence=debug.match_confidence,
        reason="non-travel OSM match",
      )
      return ctx
  if ctx.needs_osm_gate and not _passes_osm_travel_gate(debug.location):
    ctx.locate_outcome = LocateOutcome(
      status="rejected",
      mention=mention,
      location=debug.location,
      match_confidence=debug.match_confidence,
      reason="OSM category not in travel gate",
    )
    return ctx
  ctx.locate_outcome = LocateOutcome(
    status=debug.status,  # type: ignore[arg-type]
    mention=mention,
    location=debug.location,
    match_confidence=debug.match_confidence,
  )
  logger.info(
    "locate_by_name %s place_name=%r confidence=%s",
    ctx.locate_outcome.status,
    ctx.place_name,
    debug.match_confidence,
  )
  return ctx


LOCATE_BY_NAME_STEP = Step(
  name="locate_by_name",
  run=locate_by_name,
)
