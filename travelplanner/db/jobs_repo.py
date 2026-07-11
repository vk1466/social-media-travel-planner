"""Persist ingest job progress in DynamoDB (shared by API and workers)."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from botocore.exceptions import ClientError

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table

JOB_TTL_DAYS = 7
_LINK_UPDATE_ATTEMPTS = 8


def create_job(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
) -> str:
  job_id = str(uuid.uuid4())
  now = datetime.now(timezone.utc)
  item = {
    "job_id": job_id,
    "user_id": user_id,
    "status": "running",
    "refresh": refresh,
    "links": [{"post_url": post_url, "status": "pending"} for post_url in post_urls],
    "version": 0,
    "created_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "ttl": int((now + timedelta(days=JOB_TTL_DAYS)).timestamp()),
  }
  get_table("Jobs").put_item(Item=to_dynamo(item))
  return job_id


def get_job(job_id: str) -> dict[str, Any] | None:
  response = get_table("Jobs").get_item(Key={"job_id": job_id})
  item = response.get("Item")
  if item is None:
    return None
  return from_dynamo(item)


def set_execution_arn(job_id: str, execution_arn: str) -> None:
  get_table("Jobs").update_item(
    Key={"job_id": job_id},
    UpdateExpression="SET execution_arn = :arn",
    ExpressionAttributeValues={":arn": execution_arn},
  )


def mark_fetching(job_id: str, post_url: str) -> None:
  _update_link(job_id, post_url, status="fetching")


def update_link(
  job_id: str,
  *,
  post_url: str,
  status: str,
  post_id: str | None = None,
  error_message: str | None = None,
) -> None:
  _update_link(
    job_id,
    post_url,
    status=status,
    post_id=post_id,
    error_message=error_message,
  )


def mark_done(job_id: str) -> None:
  get_table("Jobs").update_item(
    Key={"job_id": job_id},
    UpdateExpression="SET #status = :done",
    ExpressionAttributeNames={"#status": "status"},
    ExpressionAttributeValues={":done": "done"},
  )


def _update_link(
  job_id: str,
  post_url: str,
  *,
  status: str,
  post_id: str | None = None,
  error_message: str | None = None,
) -> None:
  """Optimistic-lock link updates so concurrent Step Functions Map items don't clobber each other."""
  for attempt in range(_LINK_UPDATE_ATTEMPTS):
    job = get_job(job_id)
    if job is None:
      raise KeyError(f"Job not found: {job_id}")

    links = list(job.get("links") or [])
    updated = False
    for index, link in enumerate(links):
      if link.get("post_url") != post_url:
        continue
      link = dict(link)
      link["status"] = status
      if post_id is not None:
        link["post_id"] = post_id
      elif "post_id" in link and status == "fetching":
        link.pop("post_id", None)
      if error_message is not None:
        link["error_message"] = error_message
      elif status != "error":
        link.pop("error_message", None)
      links[index] = link
      updated = True
      break

    if not updated:
      raise KeyError(f"Link not found on job {job_id}: {post_url}")

    version = int(job.get("version") or 0)
    try:
      get_table("Jobs").update_item(
        Key={"job_id": job_id},
        UpdateExpression="SET links = :links, version = :new_version",
        ConditionExpression="attribute_not_exists(version) OR version = :old_version",
        ExpressionAttributeValues={
          ":links": to_dynamo(links),
          ":new_version": version + 1,
          ":old_version": version,
        },
      )
      return
    except ClientError as exc:
      if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
        raise
      time.sleep(0.025 * (attempt + 1))

  raise RuntimeError(f"Could not update link on job {job_id} after concurrent retries")
