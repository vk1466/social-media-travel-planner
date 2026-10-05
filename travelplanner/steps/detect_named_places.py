from __future__ import annotations

import logging

from travelplanner.extract import (
  content_bundle_from_post,
  format_content_snippets,
  snippets_from_bundle,
)
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.places.place_presence import places_named_in_text

logger = logging.getLogger(__name__)


def detect_named_places(ctx: IngestContext) -> IngestContext:
  """Set text_names_places from caption, comments, location tag, and transcript."""
  if ctx.resource_type not in {"reel", "video"}:
    return ctx
  if ctx.post is None:
    logger.warning("detect_named_places skipped: no post on context")
    ctx.text_names_places = False
    return ctx

  bundle = content_bundle_from_post(ctx.post, transcript=ctx.transcript)
  text = format_content_snippets(snippets_from_bundle(bundle))
  ctx.text_names_places = places_named_in_text(text)
  logger.info(
    "detect_named_places post_id=%s named=%s",
    ctx.post.post_id,
    ctx.text_names_places,
  )
  return ctx


DETECT_NAMED_PLACES_STEP = Step(
  name="detect_named_places",
  run=detect_named_places,
)
