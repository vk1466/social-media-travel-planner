from __future__ import annotations

import logging

from travelplanner.flow.context import TimelineContext
from travelplanner.flow.step import Step
from travelplanner.places.resolve import find_existing_place
from travelplanner.places.store import load_all_places, place_key

logger = logging.getLogger(__name__)


def dedupe_resolve(ctx: TimelineContext) -> TimelineContext:
  outcome = ctx.locate_outcome
  if outcome is None or outcome.location is None or outcome.mention is None:
    return ctx
  if outcome.status not in {"resolved", "low_confidence"}:
    return ctx

  library = ctx.place_library if ctx.place_library is not None else load_all_places()
  ctx.place_library = library
  location = outcome.location
  mention = outcome.mention
  key = place_key(location)
  existing = find_existing_place(key, location, mention, library=library)
  if existing is not None:
    logger.info(
      "dedupe_resolve will merge into place_id=%s display=%r",
      existing.place_id,
      existing.display_name,
    )
  return ctx


DEDUPE_RESOLVE_STEP = Step(
  name="dedupe_resolve",
  run=dedupe_resolve,
)
