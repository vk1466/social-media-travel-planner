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


def is_non_retryable_error(exc: Exception) -> bool:
  msg = str(exc).lower()
  return (
    "private" in msg
    or "deleted" in msg
    or "not found" in msg
    or "could not be fetched" in msg
    or "empty data" in msg
    or "returned no post" in msg
    or "does not exist" in msg
  )


def fetch_media(ctx: IngestContext) -> IngestContext:
  shortcode = ctx.shortcode or extract_instagram_shortcode(ctx.post_url)
  ctx.shortcode = shortcode
  logger.info("fetch_media start shortcode=%s", shortcode)
  timeout_seconds = 25.0
  try:
    raw = fetch_post(post_url=ctx.post_url, shortcode=shortcode, timeout_seconds=timeout_seconds)
  except Exception as exc:
    if is_non_retryable_error(exc):
      logger.warning("fetch_media failed with definite non-retryable error: %s", exc)
      raise
    logger.warning("fetch_media attempt 1 failed with transient error (%s), retrying...", exc)
    raw = fetch_post(post_url=ctx.post_url, shortcode=shortcode, timeout_seconds=15.0)
  ctx.raw_payload = raw

  if not raw:
    raise RuntimeError(f"Instagram post {shortcode} returned empty data (private or deleted post)")

  if raw.get("error") or raw.get("message") in {"Not found", "Post not found", "User not found"}:
    detail = raw.get("error") or raw.get("message")
    raise RuntimeError(f"Instagram post {shortcode} not found: {detail}")

  trimmed = trim_post_info(raw)

  # A real post MUST have at least an author, caption, or thumbnail/media URL.
  # If all of these are missing, the post does not exist or was deleted/private.
  has_author = bool(trimmed.get("author_handle"))
  has_caption = bool(trimmed.get("caption") and trimmed["caption"].strip())
  has_media = bool(trimmed.get("thumbnail_url") or raw.get("videoUrl") or raw.get("image") or raw.get("display_url"))

  if not has_author and not has_caption and not has_media:
    raise RuntimeError(f"Instagram post {shortcode} could not be fetched (private, deleted, or does not exist)")

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
    author_avatar_url=trimmed.get("author_avatar_url"),
    slide_media_urls=trimmed.get("slide_media_urls", ()),
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
