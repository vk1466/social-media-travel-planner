from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.places.facts.enrich import enrich_place_facts, facts_are_stale
from travelplanner.places.store import load_place

logger = logging.getLogger(__name__)


def _place_from_context(ctx: IngestContext, place_id: str):
  if ctx.place_library is not None:
    for place in ctx.place_library:
      if place.place_id == place_id:
        return place
  return load_place(place_id)


def enrich_place_facts_step(ctx: IngestContext) -> IngestContext:
  """Fetch source-backed facts (Mindcase Google Maps + OSM/Wiki) for resolved pins."""
  seen: set[str] = set()
  saved = 0
  for place_id in ctx.place_ids:
    if place_id in seen:
      continue
    seen.add(place_id)
    place = _place_from_context(ctx, place_id)
    if place is None:
      continue
    if not facts_are_stale(place.facts):
      continue
    result = enrich_place_facts(place, force=True)
    if result.status == "saved":
      saved += 1
      if result.facts is not None and ctx.place_library is not None:
        updated = replace(place, facts=result.facts)
        ctx.place_library[:] = [
          updated if item.place_id == place.place_id else item
          for item in ctx.place_library
        ]
    elif result.status == "error":
      logger.warning(
        "enrich_place_facts failed place_id=%s note=%s",
        place_id,
        result.note,
      )
  logger.info(
    "enrich_place_facts done post_url=%s attempted=%d saved=%d",
    ctx.post_url,
    len(seen),
    saved,
  )
  return ctx


def _idempotency_key(ctx: IngestContext) -> str:
  if ctx.post is not None:
    return ctx.post.post_id
  return ctx.post_url


ENRICH_PLACE_FACTS_STEP = Step(
  name="enrich_place_facts",
  run=enrich_place_facts_step,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
  writes_data=True,
  idempotency_key=_idempotency_key,
)
