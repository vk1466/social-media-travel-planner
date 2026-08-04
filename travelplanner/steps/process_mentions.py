from __future__ import annotations

import logging

from travelplanner.flow.context import IngestContext
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.flow.step import Step
from travelplanner.places.locate import locate_mention_debug
from travelplanner.places.mentions import mentions_from_post
from travelplanner.places.resolve import upsert_place_record
from travelplanner.places.shop_travel_gate import llm_ambiguous_shop_is_travel
from travelplanner.places.store import (
  is_ambiguous_shop,
  is_visitable_place,
  load_all_places,
)

logger = logging.getLogger(__name__)


def process_mentions(ctx: IngestContext) -> IngestContext:
  if ctx.post is None:
    logger.warning("process_mentions skipped: no post on context")
    return ctx

  post = ctx.post
  source_post_id = post.post_id
  library = ctx.place_library if ctx.place_library is not None else load_all_places()
  ctx.place_library = library
  mentions = mentions_from_post(post)
  anchor_cache: dict[str, tuple[float, float] | None] = {}
  place_ids: list[str] = list(ctx.place_ids)
  outcomes: list[LocateOutcome] = list(ctx.place_outcomes)

  logger.info(
    "process_mentions start post_id=%s mentions=%d",
    source_post_id,
    len(mentions),
  )

  for mention in mentions:
    try:
      debug = locate_mention_debug(mention, anchor_cache=anchor_cache)
    except Exception:
      logger.exception(
        "locate failed place_name=%r post_id=%s",
        mention.place_name,
        source_post_id,
      )
      outcomes.append(
        LocateOutcome(
          status="unresolved",
          mention=mention,
          reason="locate raised",
        )
      )
      continue

    if debug.location is None or debug.status == "unresolved":
      outcomes.append(
        LocateOutcome(
          status="unresolved",
          mention=mention,
          location=debug.location,
          match_confidence=debug.match_confidence,
          reason="; ".join(debug.notes[-3:]) if debug.notes else None,
        )
      )
      continue

    if not is_visitable_place(debug.location):
      if is_ambiguous_shop(debug.location):
        keep, gate_reason = llm_ambiguous_shop_is_travel(debug.location, mention)
        if keep:
          logger.info(
            "ambiguous shop kept by LLM place_name=%r reason=%s",
            mention.place_name,
            gate_reason,
          )
        else:
          outcomes.append(
            LocateOutcome(
              status="rejected",
              mention=mention,
              location=debug.location,
              match_confidence=debug.match_confidence,
              reason=f"ambiguous shop rejected: {gate_reason}",
            )
          )
          continue
      else:
        outcomes.append(
          LocateOutcome(
            status="rejected",
            mention=mention,
            location=debug.location,
            match_confidence=debug.match_confidence,
            reason="non-travel OSM match",
          )
        )
        continue

    saved = upsert_place_record(
      mention,
      debug.location,
      source_post_id,
      library=library,
    )
    library[:] = [place for place in library if place.place_id != saved.place_id]
    library.append(saved)

    outcome_status = debug.status  # resolved | low_confidence
    outcomes.append(
      LocateOutcome(
        status=outcome_status,  # type: ignore[arg-type]
        mention=mention,
        location=debug.location,
        place=saved,
        match_confidence=debug.match_confidence,
      )
    )
    if saved.place_id not in place_ids:
      place_ids.append(saved.place_id)

  ctx.place_ids = place_ids
  ctx.place_outcomes = outcomes
  logger.info(
    "process_mentions done post_id=%s place_ids=%d outcomes=%d",
    source_post_id,
    len(place_ids),
    len(outcomes),
  )
  return ctx


def _ingest_upsert_idempotency_key(ctx: IngestContext) -> str:
  if ctx.post is not None:
    return ctx.post.post_id
  return ctx.post_url


PROCESS_MENTIONS_STEP = Step(
  name="process_place_mentions",
  run=process_mentions,
  writes_data=True,
  retry_attempts=1,
  retry_backoff_seconds=0.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
  idempotency_key=_ingest_upsert_idempotency_key,
)
