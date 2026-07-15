from __future__ import annotations

import logging
from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace
from typing import Literal

from travelplanner.db import ingest_failures_repo, user_places_repo, user_posts_repo
from travelplanner.links import detect_platform, extract_post_id
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.places import process_post_places
from travelplanner.hierarchy import link_places
from travelplanner.sources import PLATFORM_FETCHERS
from travelplanner.store import has_post, load_post, load_post_by_id, save_post

logger = logging.getLogger(__name__)

Fetcher = Callable[[str], SavedPost]


@dataclass(frozen=True)
class IngestResult:
  post_url: str
  status: Literal["saved", "linked", "skipped", "unsupported", "error"]
  post_id: str | None = None
  error_message: str | None = None


@dataclass(frozen=True)
class IngestDeps:
  """Injectable collaborators for ingest.

  Bundling the platform-agnostic seams keeps `ingest_link` decoupled from concrete
  fetchers, the place pipeline, and the failure store — and makes them swappable in
  tests and future callers without monkeypatching module globals.
  """

  fetchers: Mapping[Platform, Fetcher]
  process_places: Callable[[SavedPost], tuple[str, ...]]
  record_failure: Callable[..., object]
  clear_failure: Callable[..., object]


def default_deps() -> IngestDeps:
  """Production wiring. Names resolve from this module so tests can still patch them."""
  return IngestDeps(
    fetchers=PLATFORM_FETCHERS,
    process_places=process_post_places,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )


def _link_post_to_user(user_id: str, post: SavedPost) -> None:
  user_posts_repo.link_user_post(user_id, post.post_id)
  user_places_repo.sync_places_from_post(user_id, post.place_ids)


def unlink_post_from_user(user_id: str, post_id: str) -> bool:
  """Remove a post from the user's library without deleting the shared post."""
  return user_posts_repo.unlink_user_post(user_id, post_id)


def _persist_failure(
  deps: IngestDeps,
  *,
  post_url: str,
  user_id: str,
  status: str,
  stage: str,
  error_message: str | None = None,
  post_id: str | None = None,
) -> None:
  """Record a failure durably. Best-effort: never masks the ingest outcome."""
  try:
    deps.record_failure(
      post_url=post_url,
      user_id=user_id,
      status=status,
      stage=stage,
      error_message=error_message,
      post_id=post_id,
    )
  except Exception:
    logger.exception("could not persist ingest failure url=%s stage=%s", post_url, stage)


def _clear_failure(deps: IngestDeps, *, post_url: str, user_id: str) -> None:
  try:
    deps.clear_failure(post_url=post_url, user_id=user_id)
  except Exception:
    logger.exception("could not clear ingest failure url=%s", post_url)


def ingest_link(
  post_url: str,
  *,
  user_id: str,
  refresh: bool = False,
  deps: IngestDeps | None = None,
) -> IngestResult:
  deps = deps or default_deps()
  post_url = post_url.strip()
  if not post_url:
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage="validation",
      error_message="Empty URL",
    )
    return IngestResult(post_url=post_url, status="error", error_message="Empty URL")
  if not user_id:
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage="validation",
      error_message="user_id is required",
    )
    return IngestResult(
      post_url=post_url,
      status="error",
      error_message="user_id is required",
    )

  platform = detect_platform(post_url)
  fetcher = deps.fetchers.get(platform) if platform is not None else None
  if fetcher is None:
    logger.info("ingest unsupported url=%s platform=%s user_id=%s", post_url, platform, user_id)
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="unsupported",
      stage="unsupported",
      error_message=f"Unsupported platform: {platform.value}" if platform else "Unrecognized URL",
    )
    return IngestResult(post_url=post_url, status="unsupported")

  try:
    native_post_id = extract_post_id(platform, post_url)
  except ValueError as exc:
    logger.warning("ingest bad post id url=%s error=%s", post_url, exc)
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage="post_id",
      error_message=str(exc),
    )
    return IngestResult(post_url=post_url, status="error", error_message=str(exc))

  global_post_id = make_post_id(platform, native_post_id)
  logger.info(
    "ingest start url=%s post_id=%s user_id=%s refresh=%s",
    post_url,
    global_post_id,
    user_id,
    refresh,
  )

  if not refresh and has_post(platform, native_post_id):
    existing = load_post(platform, native_post_id) or load_post_by_id(global_post_id)
    if existing is not None:
      already_linked = user_posts_repo.user_has_post(user_id, existing.post_id)
      _link_post_to_user(user_id, existing)
      status = "skipped" if already_linked else "linked"
      logger.info("ingest %s post_id=%s places=%d", status, existing.post_id, len(existing.place_ids))
      _clear_failure(deps, post_url=post_url, user_id=user_id)
      return IngestResult(post_url=post_url, status=status, post_id=existing.post_id)

  try:
    post = fetcher(post_url)
  except Exception as exc:
    logger.exception("ingest fetch failed post_id=%s url=%s", global_post_id, post_url)
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage="fetch",
      error_message=str(exc),
      post_id=global_post_id,
    )
    return IngestResult(
      post_url=post_url,
      status="error",
      post_id=global_post_id,
      error_message=str(exc),
    )

  place_error: str | None = None
  try:
    place_ids = deps.process_places(post)
    post = replace(post, place_ids=place_ids)
  except Exception as exc:
    logger.exception(
      "ingest place processing failed post_id=%s (post still saved)",
      post.post_id,
    )
    place_error = str(exc)

  save_post(post)
  _link_post_to_user(user_id, post)

  if place_error is not None:
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage="place_processing",
      error_message=place_error,
      post_id=post.post_id,
    )
  else:
    _clear_failure(deps, post_url=post_url, user_id=user_id)

  logger.info(
    "ingest saved post_id=%s places=%d extracted=%d",
    post.post_id,
    len(post.place_ids),
    len(post.extracted_places),
  )
  return IngestResult(post_url=post_url, status="saved", post_id=post.post_id)


def ingest_links(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool = False,
  on_result: Callable[[IngestResult], None] | None = None,
  deps: IngestDeps | None = None,
) -> list[IngestResult]:
  deps = deps or default_deps()
  logger.info(
    "ingest batch start count=%d user_id=%s refresh=%s",
    len(post_urls),
    user_id,
    refresh,
  )
  results: list[IngestResult] = []
  for post_url in post_urls:
    result = ingest_link(post_url, user_id=user_id, refresh=refresh, deps=deps)
    results.append(result)
    if on_result is not None:
      on_result(result)
  try:
    link_places()
  except Exception:
    logger.exception("hierarchy link_places failed after batch (results kept)")
  return results
