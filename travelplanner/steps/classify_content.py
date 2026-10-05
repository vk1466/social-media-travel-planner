from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.content_category_jev import category_from_text
from travelplanner.extract import (
  content_bundle_from_post,
  format_content_snippets,
  snippets_from_bundle,
)
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)


def classify_content(ctx: IngestContext) -> IngestContext:
  """Stamp content_category from a Jev choice.

  A weak choice is stored as other. The flag-off path leaves the category unset.
  """
  if not FeatureFlag.get("content_categories"):
    logger.info("classify_content skipped: feature disabled")
    return ctx
  if ctx.post is None:
    logger.warning("classify_content skipped: no post on context")
    return ctx

  bundle = content_bundle_from_post(
    ctx.post,
    transcript=ctx.transcript,
    image_text=ctx.image_text,
  )
  text = format_content_snippets(snippets_from_bundle(bundle))
  category = category_from_text(text) or "other"
  ctx.post = replace(ctx.post, content_category=category)
  logger.info("classify_content post_id=%s category=%s", ctx.post.post_id, category)
  return ctx


CLASSIFY_CONTENT_STEP = Step(
  name="classify_content",
  run=classify_content,
)
