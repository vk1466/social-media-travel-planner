from __future__ import annotations

import logging
from datetime import UTC, datetime

from travelplanner.clients.mindcase import fetch_post
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.links import extract_instagram_shortcode
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.steps.instagram.media import (
  extract_media_kind,
  trim_post_info,
)

logger = logging.getLogger(__name__)


def fetch_media(ctx: IngestContext) -> IngestContext:
  shortcode = ctx.shortcode or extract_instagram_shortcode(ctx.post_url)
  ctx.shortcode = shortcode
  logger.info("fetch_media start shortcode=%s", shortcode)
  raw = fetch_post(post_url=ctx.post_url, shortcode=shortcode)
  ctx.raw_payload = raw
  trimmed = trim_post_info(raw)
  media_kind = trimmed["media_kind"]
  ctx.resource_type = extract_media_kind(raw) if raw else media_kind

  ctx.post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, shortcode),
    post_url=ctx.post_url,
    platform=Platform.INSTAGRAM,
    media_kind=media_kind,
    caption=trimmed["caption"],
    hashtags=trimmed["hashtags"],
    author_handle=trimmed["author_handle"],
    posted_at=trimmed["posted_at"],
    like_count=trimmed["like_count"],
    comment_count=trimmed["comment_count"],
    top_comments=trimmed["top_comments"],
    places=trimmed["places"],
    thumbnail_url=trimmed["thumbnail_url"],
    fetched_at=datetime.now(tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
  )
  logger.info(
    "fetch_media done shortcode=%s media_kind=%s location_tags=%d",
    shortcode,
    media_kind,
    len(trimmed["places"]),
  )
  return ctx


FETCH_MEDIA_STEP = Step(
  name="fetch_media",
  run=fetch_media,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
