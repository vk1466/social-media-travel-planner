"""Extract text from reel/video frames specifically for recipe posts."""

from __future__ import annotations

import logging
import re

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.reel_frame_text import read_reel_frame_text
from travelplanner.steps.instagram.media import extract_video_url

logger = logging.getLogger(__name__)

_RECIPE_INDICATOR_PATTERN = re.compile(
  r"\b(ingredients?|instructions?|directions?|method|recipe:?)\b",
  re.IGNORECASE,
)
_MEASUREMENT_PATTERN = re.compile(
  r"\b(\d+\s*(?:g|ml|kg|oz|cups?|tbsps?|tsps?|tbsp|tsp|cloves?|pieces?|pinch))\b",
  re.IGNORECASE,
)
_VIDEO_REQUIRED_PATTERN = re.compile(
  r"\b(recipe in video|on[- ]screen|watch video|full recipe in video|comment ['\"]?\w+['\"]?)\b",
  re.IGNORECASE,
)


def _caption_has_complete_recipe(caption: str) -> bool:
  """True if caption alone appears to contain a structured recipe."""
  cleaned = caption.strip()
  if len(cleaned) < 120:
    return False
  if _VIDEO_REQUIRED_PATTERN.search(cleaned):
    return False

  has_section = bool(_RECIPE_INDICATOR_PATTERN.search(cleaned))
  measurements = len(_MEASUREMENT_PATTERN.findall(cleaned))
  line_count = len([line for line in cleaned.splitlines() if line.strip()])

  return has_section and measurements >= 3 and line_count >= 5


def extract_recipe_frames(ctx: IngestContext) -> IngestContext:
  """Run adaptive full-duration frame OCR on recipe videos if caption is thin."""
  if ctx.resource_type not in {"video", "reel"}:
    return ctx
  if not FeatureFlag.get("extract_reel_frame_text"):
    return ctx

  caption = ctx.post.caption if ctx.post else ""
  if caption and _caption_has_complete_recipe(caption):
    logger.info("extract_recipe_frames skipped: caption already contains complete recipe")
    return ctx

  raw = ctx.raw_payload if isinstance(ctx.raw_payload, dict) else {}
  video_url = extract_video_url(raw)
  if not video_url:
    return ctx

  text = read_reel_frame_text(str(video_url), adaptive=True)
  if text:
    if ctx.image_text:
      ctx.image_text = f"{ctx.image_text}\n\n[Reel Frame Recipe Text:\n{text}]"
    else:
      ctx.image_text = text
    logger.info("extract_recipe_frames extracted on-screen recipe text length=%d", len(text))
  return ctx


EXTRACT_RECIPE_FRAMES_STEP = Step(
  name="extract_recipe_frames",
  run=extract_recipe_frames,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
