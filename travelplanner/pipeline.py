from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, replace
from typing import Literal

from travelplanner.db import user_places_repo, user_posts_repo
from travelplanner.links import detect_platform, extract_post_id
from travelplanner.models import SavedPost, make_post_id
from travelplanner.places import process_post_places
from travelplanner.hierarchy import link_places
from travelplanner.sources import PLATFORM_FETCHERS
from travelplanner.store import has_post, load_post, load_post_by_id, save_post

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class IngestResult:
  post_url: str
  status: Literal["saved", "linked", "skipped", "unsupported", "error"]
  post_id: str | None = None
  error_message: str | None = None


def _link_post_to_user(user_id: str, post: SavedPost) -> None:
  user_posts_repo.link_user_post(user_id, post.post_id)
  user_places_repo.sync_places_from_post(user_id, post.place_ids)


def unlink_post_from_user(user_id: str, post_id: str) -> bool:
  """Remove a post from the user's library without deleting the shared post."""
  return user_posts_repo.unlink_user_post(user_id, post_id)


def ingest_link(
  post_url: str,
  *,
  user_id: str,
  refresh: bool = False,
) -> IngestResult:
  post_url = post_url.strip()
  if not post_url:
    return IngestResult(
      post_url=post_url,
      status="error",
      error_message="Empty URL",
    )
  if not user_id:
    return IngestResult(
      post_url=post_url,
      status="error",
      error_message="user_id is required",
    )

  platform = detect_platform(post_url)
  if platform is None:
    logger.info("ingest unsupported url=%s user_id=%s", post_url, user_id)
    return IngestResult(post_url=post_url, status="unsupported")

  fetcher = PLATFORM_FETCHERS.get(platform)
  if fetcher is None:
    logger.info(
      "ingest unsupported platform=%s url=%s user_id=%s",
      platform,
      post_url,
      user_id,
    )
    return IngestResult(post_url=post_url, status="unsupported")

  try:
    native_post_id = extract_post_id(platform, post_url)
  except ValueError as exc:
    logger.warning("ingest bad post id url=%s error=%s", post_url, exc)
    return IngestResult(
      post_url=post_url,
      status="error",
      error_message=str(exc),
    )

  global_post_id = make_post_id(platform, native_post_id)
  logger.info(
    "ingest start url=%s post_id=%s user_id=%s refresh=%s",
    post_url,
    global_post_id,
    user_id,
    refresh,
  )

  if not refresh and has_post(platform, native_post_id):
    existing = load_post(platform, native_post_id)
    if existing is None:
      existing = load_post_by_id(global_post_id)
    if existing is not None:
      already_linked = user_posts_repo.user_has_post(user_id, existing.post_id)
      _link_post_to_user(user_id, existing)
      status = "skipped" if already_linked else "linked"
      logger.info(
        "ingest %s post_id=%s places=%d",
        status,
        existing.post_id,
        len(existing.place_ids),
      )
      return IngestResult(
        post_url=post_url,
        status=status,
        post_id=existing.post_id,
      )

  try:
    post = fetcher(post_url)
  except Exception as exc:
    logger.exception("ingest fetch failed post_id=%s url=%s", global_post_id, post_url)
    return IngestResult(
      post_url=post_url,
      status="error",
      post_id=global_post_id,
      error_message=str(exc),
    )

  try:
    place_ids = process_post_places(post)
    post = replace(post, place_ids=place_ids)
  except Exception:
    logger.exception(
      "ingest place processing failed post_id=%s (post still saved)",
      post.post_id,
    )

  save_post(post)
  _link_post_to_user(user_id, post)
  logger.info(
    "ingest saved post_id=%s places=%d extracted=%d",
    post.post_id,
    len(post.place_ids),
    len(post.extracted_places),
  )
  return IngestResult(
    post_url=post_url,
    status="saved",
    post_id=post.post_id,
  )


def ingest_links(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool = False,
  on_result: Callable[[IngestResult], None] | None = None,
) -> list[IngestResult]:
  logger.info(
    "ingest batch start count=%d user_id=%s refresh=%s",
    len(post_urls),
    user_id,
    refresh,
  )
  results: list[IngestResult] = []
  for post_url in post_urls:
    result = ingest_link(post_url, user_id=user_id, refresh=refresh)
    results.append(result)
    if on_result is not None:
      on_result(result)
  try:
    link_places()
  except Exception:
    logger.exception("hierarchy link_places failed after batch (results kept)")
  return results
