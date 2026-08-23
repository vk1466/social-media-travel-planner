from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.content_classify import classify_from_snippets
from travelplanner.extract import content_bundle_from_post, snippets_from_bundle
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)


def classify_content(ctx: IngestContext) -> IngestContext:
  """Stamp SavedPost.content_category when the experiment flag is on."""
  if not FeatureFlag.get("content_categories"):
    logger.info("classify_content skipped: feature disabled")
    return ctx
  if ctx.post is None:
    logger.warning("classify_content skipped: no post on context")
    return ctx

  bundle = ctx.content_bundle
  if bundle is None:
    bundle = content_bundle_from_post(
      ctx.post,
      transcript=ctx.transcript,
      image_text=ctx.image_text,
      video_analysis=ctx.video_analysis,
    )
    ctx.content_bundle = bundle

  category = classify_from_snippets(snippets_from_bundle(bundle))
  if category is None:
    return ctx
  ctx.post = replace(ctx.post, content_category=category)
  logger.info("classify_content post_id=%s category=%s", ctx.post.post_id, category)
  return ctx


CLASSIFY_CONTENT_STEP = Step(
  name="classify_content",
  run=classify_content,
  retry_attempts=2,
  retry_backoff_seconds=1.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
