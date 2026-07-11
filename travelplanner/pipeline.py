from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, replace
from typing import Literal

from travelplanner.links import detect_platform, extract_post_id
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.places import process_post_places
from travelplanner.hierarchy import link_places
from travelplanner.sources import PLATFORM_FETCHERS
from travelplanner.store import has_post, save_post


@dataclass(frozen=True)
class IngestResult:
  post_url: str
  status: Literal["saved", "skipped", "unsupported", "error"]
  post_id: str | None = None
  error_message: str | None = None


def ingest_link(post_url: str, *, refresh: bool = False) -> IngestResult:
  post_url = post_url.strip()
  if not post_url:
    return IngestResult(
      post_url=post_url,
      status="error",
      error_message="Empty URL",
    )

  platform = detect_platform(post_url)
  if platform is None:
    return IngestResult(post_url=post_url, status="unsupported")

  fetcher = PLATFORM_FETCHERS.get(platform)
  if fetcher is None:
    return IngestResult(post_url=post_url, status="unsupported")

  try:
    native_post_id = extract_post_id(platform, post_url)
  except ValueError as exc:
    return IngestResult(
      post_url=post_url,
      status="error",
      error_message=str(exc),
    )

  global_post_id = make_post_id(platform, native_post_id)

  if not refresh and has_post(platform, native_post_id):
    return IngestResult(
      post_url=post_url,
      status="skipped",
      post_id=global_post_id,
    )

  try:
    post = fetcher(post_url)
  except Exception as exc:
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
    pass  # place enrichment never blocks saving the post

  save_post(post)
  return IngestResult(
    post_url=post_url,
    status="saved",
    post_id=post.post_id,
  )


def ingest_links(
  post_urls: list[str],
  *,
  refresh: bool = False,
  on_result: Callable[[IngestResult], None] | None = None,
) -> list[IngestResult]:
  results: list[IngestResult] = []
  for post_url in post_urls:
    result = ingest_link(post_url, refresh=refresh)
    results.append(result)
    if on_result is not None:
      on_result(result)
  try:
    link_places()
  except Exception:
    pass  # hierarchy never blocks ingest results
  return results
