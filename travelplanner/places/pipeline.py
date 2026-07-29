"""Rebuild place library using the shared process_mentions step."""

from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost
from travelplanner.places.candidates import mark_candidate_resolved, record_candidate
from travelplanner.places.store import delete_all_places
from travelplanner.store import load_all_posts, save_post

logger = logging.getLogger(__name__)


def _record_outcomes(post: SavedPost, ctx: IngestContext) -> None:
  for outcome in ctx.place_outcomes:
    mention = outcome.mention
    if mention is None:
      continue
    if outcome.status == "resolved" and outcome.place is not None:
      mark_candidate_resolved(
        source_post_id=post.post_id,
        place_name=mention.place_name,
        resolved_place_id=outcome.place.place_id,
      )
      continue
    if outcome.status == "low_confidence" and outcome.place is not None:
      record_candidate(
        source_post_id=post.post_id,
        mention=mention,
        status="low_confidence",
        resolved_place_id=outcome.place.place_id,
      )
      continue
    if outcome.status == "unresolved":
      record_candidate(
        source_post_id=post.post_id,
        mention=mention,
        status="unresolved",
      )


def process_post_places(post: SavedPost) -> tuple[str, ...]:
  """Normalize -> locate -> resolve/upsert via shared step. Never raises."""
  from travelplanner.steps.process_mentions import process_mentions

  ctx = IngestContext(post_url=post.post_url, user_id="", post=post)
  try:
    ctx = process_mentions(ctx)
  except Exception:
    logger.exception("process_post_places failed post_id=%s", post.post_id)
    return post.place_ids
  updated = replace(post, place_ids=tuple(ctx.place_ids))
  _record_outcomes(updated, ctx)
  return tuple(ctx.place_ids)


def reprocess_all_places(platform: Platform | None = None) -> None:
  """Rebuild place library using the locate/resolve path."""
  logger.info("places reprocess start platform=%s", platform)
  if platform is None:
    delete_all_places()

  for post in load_all_posts(platform=platform):
    place_ids = process_post_places(post)
    if place_ids != post.place_ids:
      save_post(replace(post, place_ids=place_ids))

  try:
    from travelplanner.hierarchy import link_places

    link_places()
  except Exception:
    logger.exception("hierarchy link_places failed after reprocess")
  logger.info("places reprocess done platform=%s", platform)
