"""Lambda (and local) handlers for ingest Map items and job finalize."""

from __future__ import annotations

import logging
from typing import Any

from travelplanner.hierarchy import link_places
from travelplanner.logging_config import configure_logging
from travelplanner.pipeline import IngestResult, ingest_link

from server import jobs

configure_logging()
logger = logging.getLogger(__name__)


def ingest_one_link(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
  """Process a single post URL for a job. Never raises — writes error status instead."""
  del context
  job_id = event["job_id"]
  post_url = event["post_url"]
  user_id = event["user_id"]
  refresh = bool(event.get("refresh", False))

  logger.info(
    "worker ingest_one_link job_id=%s url=%s user_id=%s refresh=%s",
    job_id,
    post_url,
    user_id,
    refresh,
  )
  try:
    jobs.mark_fetching(job_id, post_url)
    result = ingest_link(post_url, user_id=user_id, refresh=refresh)
    jobs.update_link(job_id, result)
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
