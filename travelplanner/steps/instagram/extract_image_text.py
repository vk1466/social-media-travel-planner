from __future__ import annotations

import logging

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.image_text import read_image_urls_text
from travelplanner.steps.instagram.media import extract_slide_image_urls

logger = logging.getLogger(__name__)


def extract_image_text(ctx: IngestContext) -> IngestContext:
  """OCR image/carousel slides → ctx.image_text (feature-flagged)."""
  if ctx.resource_type not in {"image", "carousel"}:
    return ctx
  if not FeatureFlag.get("extract_image_text"):
    logger.info("extract_image_text skipped: feature disabled")
    return ctx

  raw = ctx.raw_payload if isinstance(ctx.raw_payload, dict) else {}
  urls = extract_slide_image_urls(raw)
  if not urls:
    logger.info("extract_image_text skipped: no slide URLs shortcode=%s", ctx.shortcode)
    return ctx

  text = read_image_urls_text(urls)
  if text:
    ctx.image_text = text
  logger.info(
    "extract_image_text shortcode=%s slides=%d has_text=%s",
    ctx.shortcode,
    len(urls),
    bool(text),
  )
  return ctx


EXTRACT_IMAGE_TEXT_STEP = Step(
  name="extract_image_text",
  run=extract_image_text,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
