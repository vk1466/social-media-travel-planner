"""Job helpers — DynamoDB-backed, same JobSchema contract as before."""

from __future__ import annotations

from collections import Counter
from typing import Any

from travelplanner.db import jobs_repo
from travelplanner.personas.link_ingest import IngestResult

from server.schemas import JobCountsSchema, JobItemSchema, JobLinkSchema, JobSchema


def create_job(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
  kind: str = jobs_repo.JOB_KIND_LINK_INGEST,
  mark_visited: bool = False,
  username: str | None = None,
) -> str:
  del mark_visited
  return jobs_repo.create_job(
    post_urls,
    user_id=user_id,
    refresh=refresh,
    kind=kind,
    username=username,
  )


def mark_fetching(job_id: str, item_ref: str) -> None:
  jobs_repo.mark_fetching(job_id, item_ref)


def update_item(job_id: str, result: IngestResult) -> None:
  jobs_repo.update_item(
    job_id,
    result.post_url,
    status=result.outcome,
    post_id=result.post_id,
    error_message=result.reason,
  )


def update_link(job_id: str, result: IngestResult) -> None:
  update_item(job_id, result)


def mark_done(job_id: str) -> None:
  jobs_repo.mark_done(job_id)


def set_execution_arn(job_id: str, execution_arn: str) -> None:
  jobs_repo.set_execution_arn(job_id, execution_arn)


def get_job_for_user(job_id: str, user_id: str) -> JobSchema | None:
  job = jobs_repo.get_job(job_id)
  if job is None or job.get("user_id") != user_id:
    return None
  return _to_schema(job)


def get_active_job_for_user(user_id: str, *, kind: str | None = None) -> JobSchema | None:
  job = jobs_repo.get_active_job_for_user(user_id, kind=kind)
  if job is None:
    return None
  return _to_schema(job)


def _item_to_schema(item: dict[str, Any]) -> JobItemSchema:
  item_ref = item.get("item_ref") or item.get("post_url") or ""
  return JobItemSchema(
    item_ref=item_ref,
    item_kind=item.get("item_kind") or (
      "timeline_batch" if item_ref.startswith("timeline-batch:") else "post_url"
    ),
    status=item.get("status", "pending"),
    post_id=item.get("post_id"),
    stats=item.get("stats"),
    error_message=item.get("error_message"),
    batch_index=item.get("batch_index"),
    batch_start=item.get("batch_start"),
    batch_count=item.get("batch_count"),
  )


def _to_schema(job: dict) -> JobSchema:
  items = [_item_to_schema(item) for item in job.get("items") or []]
  links = [
    JobLinkSchema(
      post_url=item.item_ref,
      status=item.status,
      post_id=item.post_id,
      error_message=item.error_message,
    )
    for item in items
  ]
  return JobSchema(
    job_id=job["job_id"],
    status=job.get("status", "running"),
    refresh=bool(job.get("refresh", False)),
    kind=job.get("kind") or jobs_repo.JOB_KIND_LINK_INGEST,
    mark_visited=bool(job.get("mark_visited", False)),
    username=job.get("username"),
    counts=JobCountsSchema(**Counter(item.status for item in items)),
    items=items,
    links=links,
  )
