from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.extract import ContentBundle, fetch_places_from_content
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.steps.instagram.media import location_tag

logger = logging.getLogger(__name__)


def _build_bundle(ctx: IngestContext) -> ContentBundle | None:
  if ctx.content_bundle is not None:
    return ctx.content_bundle
  if ctx.post is None:
    return None
  post = ctx.post
  return ContentBundle(
    caption=post.caption,
    hashtags=post.hashtags,
    top_comments=post.top_comments,
    location_tag=location_tag(post.places),
    transcript=ctx.transcript,
    image_text=ctx.image_text,
    video_summary=post.reel_summary,
  )


def extract_places(ctx: IngestContext) -> IngestContext:
  bundle = _build_bundle(ctx)
  if bundle is None:
    logger.warning("extract_places skipped: no post on context")
    return ctx
  ctx.content_bundle = bundle
  extracted = fetch_places_from_content(bundle)
  if ctx.post is not None:
    ctx.post = replace(
      ctx.post,
      extracted_places=extracted.places,
      reel_summary=extracted.reel_summary,
    )
  logger.info(
    "extract_places done places=%d has_summary=%s",
    len(extracted.places),
    bool(extracted.reel_summary),
  )
  return ctx


EXTRACT_PLACES_STEP = Step(
  name="extract_places",
  run=extract_places,
  retry_attempts=2,
  retry_backoff_seconds=1.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
