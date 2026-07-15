"""Lambda (and local) handlers for ingest Map items and job finalize."""

from __future__ import annotations

import logging
from typing import Any

from travelplanner.db import jobs_repo
from travelplanner.hierarchy import link_places
from travelplanner.logging_config import configure_logging
from travelplanner.pipeline import IngestResult, ingest_link
from travelplanner.store import load_post_by_id
from travelplanner.visits import mark_visited

from server import jobs

configure_logging()
logger = logging.getLogger(__name__)


def _visited_from_posted_at(posted_at: str | None) -> str | None:
  if not posted_at:
    return None
  # SavedPost.posted_at is ISO UTC; visit dates are YYYY-MM-DD.
  return posted_at[:10] if len(posted_at) >= 10 else None


def _auto_mark_visited_for_post(*, user_id: str, post_id: str) -> int:
  post = load_post_by_id(post_id)
  if post is None:
    return 0
  visited_from = _visited_from_posted_at(post.posted_at)
  marked = 0
  for place_id in post.place_ids:
    mark_visited(user_id=user_id, place_id=place_id, visited_from=visited_from)
    marked += 1
  return marked


def ingest_one_link(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
  """Process a single post URL for a job. Never raises — writes error status instead."""
  del context
  job_id = event["job_id"]
  post_url = event["post_url"]
  user_id = event["user_id"]
  refresh = bool(event.get("refresh", False))
  mark_visited_flag = bool(event.get("mark_visited", False))
  if not mark_visited_flag:
    job = jobs_repo.get_job(job_id)
    mark_visited_flag = bool(job and job.get("mark_visited"))

  logger.info(
    "worker ingest_one_link job_id=%s url=%s user_id=%s refresh=%s mark_visited=%s",
    job_id,
    post_url,
    user_id,
    refresh,
    mark_visited_flag,
  )
  try:
    jobs.mark_fetching(job_id, post_url)
    result = ingest_link(post_url, user_id=user_id, refresh=refresh)
    jobs.update_link(job_id, result)
    if (
      mark_visited_flag
      and result.post_id
      and result.status in {"saved", "linked", "skipped"}
    ):
      marked = _auto_mark_visited_for_post(user_id=user_id, post_id=result.post_id)
      logger.info(
        "worker auto-marked visits job_id=%s post_id=%s places=%d",
        job_id,
        result.post_id,
        marked,
      )
    logger.info(
      "worker ingest_one_link done job_id=%s status=%s post_id=%s",
      job_id,
      result.status,
      result.post_id,
    )
    return {
      "job_id": job_id,
      "post_url": post_url,
      "status": result.status,
      "post_id": result.post_id,
    }
  except Exception as exc:
    logger.exception("worker ingest_one_link crashed job_id=%s url=%s", job_id, post_url)
    jobs.update_link(
      job_id,
      IngestResult(post_url=post_url, status="error", error_message=str(exc)),
    )
    return {
      "job_id": job_id,
      "post_url": post_url,
      "status": "error",
      "error_message": str(exc),
    }


def finalize_job(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
  """Run hierarchy linking and mark the job done."""
  del context
  job_id = event["job_id"]
  logger.info("worker finalize_job start job_id=%s", job_id)
  try:
    link_places()
  except Exception:
    logger.exception("worker finalize_job hierarchy failed job_id=%s", job_id)
  jobs.mark_done(job_id)
  logger.info("worker finalize_job done job_id=%s", job_id)
  return {"job_id": job_id, "status": "done"}
