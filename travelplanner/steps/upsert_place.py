from __future__ import annotations

import logging

from travelplanner.flow.context import TimelineContext
from travelplanner.flow.step import Step
from travelplanner.places.resolve import upsert_place_record
from travelplanner.places.store import load_all_places, place_key

logger = logging.getLogger(__name__)


def _timeline_idempotency_key(ctx: TimelineContext) -> str:
  outcome = ctx.locate_outcome
  if outcome and outcome.location:
    return place_key(outcome.location)
  return f"{ctx.latitude:.5f},{ctx.longitude:.5f}"


def upsert_place(ctx: TimelineContext) -> TimelineContext:
  outcome = ctx.locate_outcome
  if outcome is None or outcome.location is None or outcome.mention is None:
    return ctx
  if outcome.status not in {"resolved", "low_confidence"}:
    return ctx

  library = ctx.place_library if ctx.place_library is not None else load_all_places()
  ctx.place_library = library
  saved = upsert_place_record(
    outcome.mention,
    outcome.location,
    source_post_id=None,
    library=library,
  )
  ctx.place = saved
  library[:] = [place for place in library if place.place_id != saved.place_id]
  library.append(saved)
  logger.info(
    "upsert_place place_id=%s display=%r",
    saved.place_id,
    saved.display_name,
  )
  return ctx


UPSERT_PLACE_STEP = Step(
  name="upsert_place",
  run=upsert_place,
  writes_data=True,
  retry_attempts=1,
  retry_backoff_seconds=0.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
  idempotency_key=_timeline_idempotency_key,
)
