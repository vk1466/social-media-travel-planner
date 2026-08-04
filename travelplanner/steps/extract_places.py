from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.extract import (
  content_bundle_from_post,
  fetch_places_from_snippets,
  snippets_from_bundle,
)
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)


def extract_places(ctx: IngestContext) -> IngestContext:
  """Run generic place extraction over content snippets on the context."""
  bundle = ctx.content_bundle
  if bundle is None:
    if ctx.post is None:
      logger.warning("extract_places skipped: no content_bundle or post on context")
      return ctx
    bundle = content_bundle_from_post(
      ctx.post,
      transcript=ctx.transcript,
      image_text=ctx.image_text,
      video_analysis=ctx.video_analysis,
    )
  ctx.content_bundle = bundle
  snippets = snippets_from_bundle(bundle)
  extracted = fetch_places_from_snippets(snippets)
  if ctx.post is not None:
    ctx.post = replace(
      ctx.post,
      extracted_places=extracted.places,
      reel_summary=extracted.reel_summary,
    )
  logger.info(
    "extract_places done places=%d has_summary=%s sources=%s",
    len(extracted.places),
    bool(extracted.reel_summary),
    [snippet.source for snippet in snippets],
  )
  return ctx


EXTRACT_PLACES_STEP = Step(
  name="extract_places",
  run=extract_places,
  retry_attempts=2,
  retry_backoff_seconds=1.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
