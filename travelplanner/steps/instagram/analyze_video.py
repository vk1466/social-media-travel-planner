from __future__ import annotations

import logging

from travelplanner.clients.supadata import fetch_video_analysis
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.steps.instagram.media import canonical_media_url

logger = logging.getLogger(__name__)


def analyze_video(ctx: IngestContext) -> IngestContext:
  """Multimodal video analysis → ctx.video_analysis (feature-flagged)."""
  if ctx.resource_type not in {"video", "reel"}:
    return ctx
  if not FeatureFlag.get("extract_video_analysis"):
    logger.info("analyze_video skipped: feature disabled")
    return ctx
  if not ctx.shortcode:
    return ctx

  media_url = canonical_media_url(ctx.shortcode, ctx.resource_type)
  text = fetch_video_analysis(media_url)
  ctx.video_analysis = text
  logger.info(
    "analyze_video shortcode=%s has_analysis=%s",
    ctx.shortcode,
    bool(text),
  )
  return ctx


ANALYZE_VIDEO_STEP = Step(
  name="analyze_video",
  run=analyze_video,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
