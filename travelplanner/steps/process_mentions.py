from __future__ import annotations

import logging

from travelplanner.flow.context import IngestContext
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.flow.step import Step
from travelplanner.places.mention_gate import locate_mention_for_library
from travelplanner.places.mentions import mentions_from_post
from travelplanner.places.resolve import upsert_place_record
from travelplanner.places.store import load_all_places

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
  post_anchor: tuple[float, float] | None = None
  if post.places:
    tag = post.places[0]
    if tag.latitude is not None and tag.longitude is not None:
      post_anchor = (tag.latitude, tag.longitude)
    elif tag.place_name:
      from travelplanner.clients.geocoder import geocode

      try:
        loc = geocode(tag.place_name)
        if loc:
          post_anchor = (loc.latitude, loc.longitude)
      except Exception:
        pass

  if post_anchor is None and mentions:
    from collections import Counter

    city_pairs = [
      (m.city.strip().title(), (m.country or "").strip().title())
      for m in mentions
      if m.city and m.city.strip()
    ]
    if city_pairs:
      (dom_city, dom_country), count = Counter(city_pairs).most_common(1)[0]
      from travelplanner.clients.geocoder import geocode

      try:
        loc = geocode(f"{dom_city}, {dom_country}".strip(", "))
        if loc:
          post_anchor = (loc.latitude, loc.longitude)
      except Exception:
        pass

  if post_anchor is not None:
    anchor_cache["__post_anchor__"] = post_anchor

  place_ids: list[str] = list(ctx.place_ids)
  outcomes: list[LocateOutcome] = list(ctx.place_outcomes)

  logger.info(
    "process_mentions start post_id=%s mentions=%d anchor=%s",
    source_post_id,
    len(mentions),
    post_anchor,
  )

  for mention in mentions:
    try:
      gated = locate_mention_for_library(mention, anchor_cache=anchor_cache)
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

    outcome = gated.outcome
    if outcome.status in {"unresolved", "rejected"} or outcome.location is None:
      outcomes.append(outcome)
      continue

    saved = upsert_place_record(
      mention,
      outcome.location,
      source_post_id,
      library=library,
    )
    library[:] = [place for place in library if place.place_id != saved.place_id]
    library.append(saved)

    outcomes.append(
      LocateOutcome(
        status=outcome.status,
        mention=mention,
        location=outcome.location,
        place=saved,
        match_confidence=outcome.match_confidence,
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
