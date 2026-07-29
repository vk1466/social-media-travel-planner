from __future__ import annotations

import logging
import re

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.links import extract_instagram_shortcode
from travelplanner.models import Platform
from travelplanner.steps.instagram.media import extract_media_kind

logger = logging.getLogger(__name__)

_REEL_URL = re.compile(r"instagram\.com/(?:reels?|tv)/", re.IGNORECASE)


def _resource_type_from_url(post_url: str) -> str | None:
  lowered = post_url.lower()
  if _REEL_URL.search(lowered):
    return "reel"
  if "/p/" in lowered:
    return None
  return None


def detect_resource_type(ctx: IngestContext) -> IngestContext:
  ctx.platform = Platform.INSTAGRAM
  if not ctx.shortcode:
    ctx.shortcode = extract_instagram_shortcode(ctx.post_url)
  if ctx.raw_payload:
    ctx.resource_type = extract_media_kind(ctx.raw_payload)
    logger.info(
      "detect_resource_type from payload shortcode=%s resource_type=%s",
      ctx.shortcode,
      ctx.resource_type,
    )
    return ctx
  guessed = _resource_type_from_url(ctx.post_url)
  if guessed:
    ctx.resource_type = guessed
  logger.info(
    "detect_resource_type from url shortcode=%s resource_type=%s",
    ctx.shortcode,
    ctx.resource_type,
  )
  return ctx


DETECT_RESOURCE_TYPE_STEP = Step(
  name="detect_resource_type",
  run=detect_resource_type,
)
