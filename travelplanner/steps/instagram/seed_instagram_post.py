from __future__ import annotations

import logging
import re

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.links import extract_instagram_shortcode
from travelplanner.models import Platform
from travelplanner.steps.instagram.media import extract_media_kind

logger = logging.getLogger(__name__)

_REEL_URL = re.compile(
  r"instagram\.com/(?:(?:reels?|tv)|[A-Za-z0-9._]+/(?:reels?|tv))/",
  re.IGNORECASE,
)


def _resource_type_from_url(post_url: str) -> str | None:
  lowered = post_url.lower()
  if _REEL_URL.search(lowered):
    return "reel"
  if "/p/" in lowered:
    return None
  return None


def seed_instagram_post(ctx: IngestContext) -> IngestContext:
  ctx.platform = Platform.INSTAGRAM
  if not ctx.shortcode:
    ctx.shortcode = extract_instagram_shortcode(ctx.post_url)
  if ctx.raw_payload:
    ctx.resource_type = extract_media_kind(ctx.raw_payload)
    logger.info(
      "seed_instagram_post from payload shortcode=%s resource_type=%s",
      ctx.shortcode,
      ctx.resource_type,
    )
    return ctx
  guessed = _resource_type_from_url(ctx.post_url)
  if guessed:
    ctx.resource_type = guessed
  logger.info(
    "seed_instagram_post from url shortcode=%s resource_type=%s",
    ctx.shortcode,
    ctx.resource_type,
  )
  return ctx


SEED_INSTAGRAM_POST_STEP = Step(
  name="seed_instagram_post",
  run=seed_instagram_post,
)
