from __future__ import annotations

import threading
import uuid
from collections import Counter
from dataclasses import dataclass, field

from travelplanner.pipeline import IngestResult

from server.schemas import JobCountsSchema, JobLinkSchema, JobSchema


@dataclass
class Job:
  job_id: str
  refresh: bool
  links: list[JobLinkSchema] = field(default_factory=list)
  status: str = "running"


class JobStore:
  def __init__(self) -> None:
    self._jobs: dict[str, Job] = {}
    self._lock = threading.Lock()

  def create_job(self, post_urls: list[str], *, refresh: bool) -> str:
    job_id = str(uuid.uuid4())
    job = Job(
      job_id=job_id,
      refresh=refresh,
      links=[JobLinkSchema(post_url=post_url, status="pending") for post_url in post_urls],
    )
    with self._lock:
      self._jobs[job_id] = job
    return job_id

  def mark_fetching(self, job_id: str, post_url: str) -> None:
    with self._lock:
      for link in self._jobs[job_id].links:
        if link.post_url == post_url:
          link.status = "fetching"

  def update_link(self, job_id: str, result: IngestResult) -> None:
    with self._lock:
      for link in self._jobs[job_id].links:
        if link.post_url == result.post_url:
          link.status = result.status
          link.post_id = result.post_id
          link.error_message = result.error_message
          break

  def mark_done(self, job_id: str) -> None:
    with self._lock:
      self._jobs[job_id].status = "done"

  def to_schema(self, job_id: str) -> JobSchema | None:
    with self._lock:
      job = self._jobs.get(job_id)
      if job is None:
        return None
      links = [link.model_copy() for link in job.links]
      status = job.status
      refresh = job.refresh

    return JobSchema(
      job_id=job_id,
      status=status,  # type: ignore[arg-type]
      refresh=refresh,
      counts=JobCountsSchema(**Counter(link.status for link in links)),
      links=links,
    )


job_store = JobStore()
