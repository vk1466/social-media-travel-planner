from __future__ import annotations

import logging

from travelplanner.features import EXTRACT_IMAGE_TEXT, enabled
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)


def extract_image_text(ctx: IngestContext) -> IngestContext:
  if ctx.resource_type not in {"image", "carousel"}:
    return ctx
  if not enabled(EXTRACT_IMAGE_TEXT):
    logger.info("extract_image_text skipped: feature disabled")
    return ctx
  # OCR not implemented yet — reserved for when FEATURE_EXTRACT_IMAGE_TEXT is on.
  logger.info("extract_image_text noop (not implemented)")
  return ctx


EXTRACT_IMAGE_TEXT_STEP = Step(
  name="extract_image_text",
  run=extract_image_text,
)
