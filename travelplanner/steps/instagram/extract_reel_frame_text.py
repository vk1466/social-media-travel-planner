from __future__ import annotations

import logging

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.reel_frame_text import read_reel_frame_text
from travelplanner.steps.instagram.media import extract_video_url

logger = logging.getLogger(__name__)


def extract_reel_frame_text(ctx: IngestContext) -> IngestContext:
  """OCR sampled reel/video frames → ctx.image_text (feature-flagged)."""
  if ctx.resource_type not in {"video", "reel"}:
    return ctx
  if not FeatureFlag.get("extract_reel_frame_text"):
    logger.info("extract_reel_frame_text skipped: feature disabled")
    return ctx

  raw = ctx.raw_payload if isinstance(ctx.raw_payload, dict) else {}
  video_url = extract_video_url(raw)
  if not video_url:
    logger.info("extract_reel_frame_text skipped: no video_url")
    return ctx

  text = read_reel_frame_text(str(video_url))
  if text:
    # Prefer OCR for on-screen text; keep any prior image_text if OCR empty.
    ctx.image_text = text
  logger.info(
    "extract_reel_frame_text shortcode=%s has_text=%s",
    ctx.shortcode,
    bool(text),
  )
  return ctx


EXTRACT_REEL_FRAME_TEXT_STEP = Step(
  name="extract_reel_frame_text",
  run=extract_reel_frame_text,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
