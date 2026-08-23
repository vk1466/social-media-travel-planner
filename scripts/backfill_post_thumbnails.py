#!/usr/bin/env python3
"""Re-fetch Instagram post thumbnails, persist to S3, and update DynamoDB.

Instagram CDN URLs expire. This script calls Mindcase for a fresh
display image, uploads the image to MEDIA_BUCKET when configured, and writes
the durable S3 URL (or CDN fallback) to thumbnail_url / fetched_at.
"""

from __future__ import annotations

import argparse
import logging
import ssl
import time
import urllib.error
import urllib.request
from dataclasses import replace
from datetime import UTC, datetime
from urllib.parse import urlparse

import certifi

from travelplanner.clients.mindcase import fetch_post
from travelplanner.library import list_user_posts
from travelplanner.logging_config import configure_logging
from travelplanner.media.thumbnails import persist_thumbnail
from travelplanner.models import Platform, SavedPost, parse_post_id
from travelplanner.steps.instagram.media import extract_thumbnail_url
from travelplanner.store import load_all_posts, save_post

logger = logging.getLogger(__name__)

_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def _thumbnail_reachable(url: str) -> bool:
  request = urllib.request.Request(
    url,
    headers={
      "User-Agent": "Mozilla/5.0",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  )
  try:
    with urllib.request.urlopen(request, timeout=20, context=_SSL_CONTEXT) as resp:
      content_type = resp.headers.get_content_type()
      body = resp.read(64)
      return content_type.startswith("image/") and bool(body)
  except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
    return False


def _is_s3_thumbnail_url(url: str) -> bool:
  try:
    host = urlparse(url).hostname or ""
  except ValueError:
    return False
  host = host.lower()
  return ".amazonaws.com" in host and "s3" in host


def _posts_for_scope(user_id: str | None) -> list[SavedPost]:
  if user_id:
    return list_user_posts(user_id)
  return [post for post in load_all_posts() if post.platform == Platform.INSTAGRAM]


def refresh_post_thumbnail(post: SavedPost, *, force: bool, dry_run: bool) -> str:
  """Return status: skipped | unchanged | updated | missing | error."""
  if post.platform != Platform.INSTAGRAM:
    return "skipped"

  existing = (post.thumbnail_url or "").strip()
  if (
    existing
    and not force
    and _is_s3_thumbnail_url(existing)
    and _thumbnail_reachable(existing)
  ):
    return "unchanged"

  try:
    _, shortcode = parse_post_id(post.post_id)
  except ValueError as exc:
    logger.warning("bad post_id=%s: %s", post.post_id, exc)
    return "error"

  fresh_cdn: str | None = None
  try:
    raw = fetch_post(post_url=post.post_url, shortcode=shortcode)
    fresh_cdn = extract_thumbnail_url(raw)
  except Exception as exc:  # Mindcase / network
    logger.warning("fetch failed post_id=%s: %s", post.post_id, exc)

  # When Mindcase is rate-limited, still try to persist a reachable stored CDN URL.
  source = fresh_cdn
  if not source and existing and not _is_s3_thumbnail_url(existing) and _thumbnail_reachable(existing):
    source = existing
    logger.info("using stored CDN url post_id=%s", post.post_id)

  if not source:
    if not fresh_cdn and not existing:
      logger.warning("no thumbnail in payload post_id=%s", post.post_id)
      return "missing"
    return "error"

  if dry_run:
    logger.info("would update post_id=%s", post.post_id)
    return "updated"

  durable = persist_thumbnail(post.post_id, source) or source
  if durable == existing and _is_s3_thumbnail_url(durable) and not force:
    return "unchanged"

  updated = replace(
    post,
    thumbnail_url=durable,
    fetched_at=datetime.now(tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
  )
  save_post(updated)
  ok = _thumbnail_reachable(durable)
  logger.info(
    "updated post_id=%s reachable=%s s3=%s url=%s",
    post.post_id,
    ok,
    _is_s3_thumbnail_url(durable),
    durable[:96],
  )
  return "updated"


def main() -> None:
  configure_logging()
  parser = argparse.ArgumentParser(
    description="Backfill Instagram post thumbnails into S3 (when MEDIA_BUCKET is set)."
  )
  parser.add_argument(
    "--user-id",
    default=None,
    help="Limit to one Clerk (or local) user; default is all Instagram posts",
  )
  parser.add_argument(
    "--force",
    action="store_true",
    help="Re-fetch and re-upload even when a reachable S3 URL is already stored",
  )
  parser.add_argument(
    "--dry-run",
    action="store_true",
    help="Fetch and report without writing DynamoDB / S3",
  )
  parser.add_argument(
    "--sleep",
    type=float,
    default=0.4,
    help="Seconds between Mindcase calls (default 0.4)",
  )
  args = parser.parse_args()

  posts = _posts_for_scope(args.user_id)
  counts = {"skipped": 0, "unchanged": 0, "updated": 0, "missing": 0, "error": 0}
  logger.info("backfill start posts=%d user_id=%s force=%s", len(posts), args.user_id, args.force)

  for index, post in enumerate(posts):
    status = refresh_post_thumbnail(post, force=args.force, dry_run=args.dry_run)
    counts[status] = counts.get(status, 0) + 1
    if index + 1 < len(posts) and args.sleep > 0:
      time.sleep(args.sleep)

  print(
    "done: "
    f"updated={counts['updated']}, "
    f"unchanged={counts['unchanged']}, "
    f"missing={counts['missing']}, "
    f"skipped={counts['skipped']}, "
    f"errors={counts['error']}"
  )


if __name__ == "__main__":
  main()
