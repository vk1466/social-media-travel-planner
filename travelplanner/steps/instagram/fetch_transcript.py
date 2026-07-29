from __future__ import annotations

import logging

from travelplanner.clients.supadata import fetch_transcript
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.steps.instagram.media import canonical_media_url

logger = logging.getLogger(__name__)


def fetch_transcript_step(ctx: IngestContext) -> IngestContext:
  if ctx.resource_type not in {"video", "reel"}:
    return ctx
  if not ctx.shortcode:
    return ctx
  media_kind = ctx.resource_type
  media_url = canonical_media_url(ctx.shortcode, media_kind)
  ctx.transcript = fetch_transcript(media_url)
  logger.info(
    "fetch_transcript shortcode=%s has_transcript=%s",
    ctx.shortcode,
    bool(ctx.transcript),
  )
  return ctx


FETCH_TRANSCRIPT_STEP = Step(
  name="fetch_transcript",
  run=fetch_transcript_step,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
