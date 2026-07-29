from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, replace
from typing import Literal

from travelplanner.db import ingest_failures_repo, user_places_repo, user_posts_repo
from travelplanner.extract import ContentBundle, ReelBundle, fetch_places_from_content, fetch_places_from_reel
from travelplanner.flow.context import IngestContext
from travelplanner.flow.pipelines.dispatch import run_instagram_pipeline
from travelplanner.flow.runner import PipelineResult, PipelineStepError
from travelplanner.hierarchy import link_places
from travelplanner.links import detect_platform, extract_post_id
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.places.candidates import mark_candidate_resolved, record_candidate
from travelplanner.store import has_post, load_all_posts, load_post, load_post_by_id, save_post
from travelplanner.visits import mark_visited

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class IngestResult:
  post_url: str
  outcome: Literal["saved", "linked", "skipped", "unsupported", "error"]
  post_id: str | None = None
  reason: str | None = None


@dataclass(frozen=True)
class IngestDeps:
  """Injectable collaborators for ingest."""

  run_pipeline: Callable[[IngestContext], PipelineResult[IngestContext]]
  record_failure: Callable[..., object]
  clear_failure: Callable[..., object]


def default_deps() -> IngestDeps:
  return IngestDeps(
    run_pipeline=run_instagram_pipeline,
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


def _visited_from_posted_at(posted_at: str | None) -> str | None:
  if not posted_at:
    return None
  return posted_at[:10] if len(posted_at) >= 10 else None


def _auto_mark_visited_for_post(*, user_id: str, post_id: str) -> int:
  post = load_post_by_id(post_id)
  if post is None:
    return 0
  visited_from = _visited_from_posted_at(post.posted_at)
  marked = 0
  for place_id in post.place_ids:
    mark_visited(
      user_id=user_id,
      place_id=place_id,
      visited_from=visited_from,
      source="instagram",
    )
    marked += 1
  return marked


def _record_place_outcomes(post: SavedPost, ctx: IngestContext) -> None:
  for outcome in ctx.place_outcomes:
    mention = outcome.mention
    if mention is None:
      continue
    if outcome.status == "resolved" and outcome.place is not None:
      mark_candidate_resolved(
        source_post_id=post.post_id,
        place_name=mention.place_name,
        resolved_place_id=outcome.place.place_id,
      )
      continue
    if outcome.status == "low_confidence" and outcome.place is not None:
      record_candidate(
        source_post_id=post.post_id,
        mention=mention,
        status="low_confidence",
        resolved_place_id=outcome.place.place_id,
      )
      continue
    if outcome.status == "unresolved":
      record_candidate(
        source_post_id=post.post_id,
        mention=mention,
        status="unresolved",
      )
    # rejected (non-travel) — no candidate; policy decided at the edge


def ingest_link(
  post_url: str,
  *,
  user_id: str,
  refresh: bool = False,
  mark_visited: bool = False,
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
    return IngestResult(post_url=post_url, outcome="error", reason="Empty URL")
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
      outcome="error",
      reason="user_id is required",
    )

  platform = detect_platform(post_url)
  if platform is None or platform != Platform.INSTAGRAM:
    logger.info("ingest unsupported url=%s platform=%s user_id=%s", post_url, platform, user_id)
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="unsupported",
      stage="unsupported",
      error_message=f"Unsupported platform: {platform.value}" if platform else "Unrecognized URL",
    )
    return IngestResult(post_url=post_url, outcome="unsupported")

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
    return IngestResult(post_url=post_url, outcome="error", reason=str(exc))

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
      outcome = "skipped" if already_linked else "linked"
      logger.info("ingest %s post_id=%s places=%d", outcome, existing.post_id, len(existing.place_ids))
      _clear_failure(deps, post_url=post_url, user_id=user_id)
      result = IngestResult(post_url=post_url, outcome=outcome, post_id=existing.post_id)
      if mark_visited and result.post_id:
        _auto_mark_visited_for_post(user_id=user_id, post_id=result.post_id)
      return result

  ctx = IngestContext(post_url=post_url, user_id=user_id, refresh=refresh, platform=platform)
  try:
    pipeline_result = deps.run_pipeline(ctx)
  except PipelineStepError as exc:
    pipeline_result = PipelineResult(
      context=ctx,
      failed_step=exc.step_name,
      error_message=str(exc),
    )
  ctx = pipeline_result.context

  if pipeline_result.failed_step is not None:
    stage = pipeline_result.failed_step
    error_message = pipeline_result.error_message or ctx.error_message or "Pipeline failed"
    post_id = ctx.post.post_id if ctx.post is not None else global_post_id
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage=stage,
      error_message=error_message,
      post_id=post_id,
    )
    return IngestResult(
      post_url=post_url,
      outcome="error",
      post_id=post_id,
      reason=error_message,
    )

  post = ctx.post
  if post is None:
    _persist_failure(
      deps,
      post_url=post_url,
      user_id=user_id,
      status="error",
      stage="fetch_media",
      error_message="Pipeline completed without a post",
      post_id=global_post_id,
    )
    return IngestResult(
      post_url=post_url,
      outcome="error",
      post_id=global_post_id,
      reason="Pipeline completed without a post",
    )

  post = replace(post, place_ids=tuple(ctx.place_ids))
  _record_place_outcomes(post, ctx)
  save_post(post)
  _link_post_to_user(user_id, post)
  _clear_failure(deps, post_url=post_url, user_id=user_id)

  logger.info(
    "ingest saved post_id=%s places=%d extracted=%d",
    post.post_id,
    len(post.place_ids),
    len(post.extracted_places),
  )
  result = IngestResult(post_url=post_url, outcome="saved", post_id=post.post_id)
  if mark_visited and result.post_id:
    _auto_mark_visited_for_post(user_id=user_id, post_id=result.post_id)
  return result


def ingest_links(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool = False,
  mark_visited: bool = False,
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
    result = ingest_link(
      post_url,
      user_id=user_id,
      refresh=refresh,
      mark_visited=mark_visited,
      deps=deps,
    )
    results.append(result)
    if on_result is not None:
      on_result(result)
  try:
    link_places()
  except Exception:
    logger.exception("hierarchy link_places failed after batch (results kept)")
  return results


def reextract_post(post: SavedPost) -> SavedPost:
  """Re-run place extraction from stored post content — no platform re-fetch."""
  bundle = ContentBundle(
    caption=post.caption or "",
    hashtags=post.hashtags,
    top_comments=post.top_comments,
    location_tag=post.places[0] if post.places else None,
    video_summary=post.reel_summary,
  )
  extraction = fetch_places_from_content(bundle)
  if not extraction.places:
    # Fallback for older callers/tests that only have reel bundle helpers.
    extraction = fetch_places_from_reel(
      ReelBundle(
        caption=post.caption or "",
        hashtags=post.hashtags,
        top_comments=post.top_comments,
        location_tag=post.places[0] if post.places else None,
        video_summary=post.reel_summary,
      )
    )
  if not extraction.places:
    logger.info("reextract kept existing post_id=%s (no places returned)", post.post_id)
    return post

  return replace(
    post,
    extracted_places=extraction.places,
    reel_summary=extraction.reel_summary or post.reel_summary,
  )


def reextract_all_posts(platform: Platform | None = None) -> int:
  """Re-extract every stored post; returns how many changed."""
  logger.info("reextract start platform=%s", platform)
  changed = 0
  for post in load_all_posts(platform=platform):
    if not (post.caption or "").strip():
      continue
    try:
      updated = reextract_post(post)
    except Exception:
      logger.exception("reextract failed post_id=%s (post kept)", post.post_id)
      continue
    if updated != post:
      save_post(updated)
      changed += 1
  logger.info("reextract done platform=%s changed=%d", platform, changed)
  return changed
