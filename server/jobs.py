"""Job helpers — DynamoDB-backed, same JobSchema contract as before."""

from __future__ import annotations

from collections import Counter

from travelplanner.db import jobs_repo
from travelplanner.pipeline import IngestResult

from server.schemas import JobCountsSchema, JobLinkSchema, JobSchema


def create_job(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
  kind: str = jobs_repo.JOB_KIND_LINK_INGEST,
  mark_visited: bool = False,
  username: str | None = None,
) -> str:
  return jobs_repo.create_job(
    post_urls,
    user_id=user_id,
    refresh=refresh,
    kind=kind,
    mark_visited=mark_visited,
    username=username,
  )


def mark_fetching(job_id: str, post_url: str) -> None:
  jobs_repo.mark_fetching(job_id, post_url)


def update_link(job_id: str, result: IngestResult) -> None:
  jobs_repo.update_link(
    job_id,
    post_url=result.post_url,
    status=result.status,
    post_id=result.post_id,
    error_message=result.error_message,
  )


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


def _to_schema(job: dict) -> JobSchema:
  links = [
    JobLinkSchema(
      post_url=link["post_url"],
      status=link.get("status", "pending"),
      post_id=link.get("post_id"),
      error_message=link.get("error_message"),
    )
    for link in job.get("links") or []
  ]
  return JobSchema(
    job_id=job["job_id"],
    status=job.get("status", "running"),
    refresh=bool(job.get("refresh", False)),
    kind=job.get("kind") or jobs_repo.JOB_KIND_LINK_INGEST,
    mark_visited=bool(job.get("mark_visited", False)),
    username=job.get("username"),
    counts=JobCountsSchema(**Counter(link.status for link in links)),
    links=links,
  )
