"""Persist ingest job progress in DynamoDB (shared by API and workers)."""

from __future__ import annotations

import random
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import JOBS_USER_CREATED_INDEX, get_table

JOB_TTL_DAYS = 7
_ITEM_UPDATE_ATTEMPTS = 16

JOB_KIND_LINK_INGEST = "link_ingest"
JOB_KIND_INSTAGRAM_PROFILE_IMPORT = "instagram_profile_import"
JOB_KIND_TIMELINE_IMPORT = "timeline_import"

_IN_FLIGHT_STATUSES = frozenset({"pending", "fetching"})


class JobNotRunningError(Exception):
  """The job is no longer running, so it cannot be queued onto."""


def _item_ref(item: dict[str, Any]) -> str:
  return item.get("item_ref") or item.get("post_url") or ""


def _has_in_flight(job: dict[str, Any]) -> bool:
  return any(
    (item.get("status") or "pending") in _IN_FLIGHT_STATUSES
    for item in job.get("items") or []
  )


def _commit_items(
  job_id: str,
  version: int,
  items: list[dict[str, Any]],
  *,
  extra_set: str = "",
  extra_names: dict[str, str] | None = None,
  extra_values: dict[str, Any] | None = None,
  extra_condition: str = "",
) -> None:
  names = {"#items": "items"}
  if extra_names:
    names.update(extra_names)
  values: dict[str, Any] = {
    ":items": to_dynamo(items),
    ":new_version": version + 1,
    ":old_version": version,
  }
  if extra_values:
    values.update(extra_values)
  condition = "attribute_not_exists(version) OR version = :old_version"
  if extra_condition:
    condition = f"({condition}) AND ({extra_condition})"
  update = "SET #items = :items, version = :new_version"
  if extra_set:
    update = f"{update}, {extra_set}"
  get_table("Jobs").update_item(
    Key={"job_id": job_id},
    UpdateExpression=update,
    ConditionExpression=condition,
    ExpressionAttributeNames=names,
    ExpressionAttributeValues=values,
  )


def _post_url_item(post_url: str) -> dict[str, Any]:
  return {
    "item_ref": post_url,
    "item_kind": "post_url",
    "status": "pending",
  }


def _timeline_batch_item(
  index: int,
  *,
  batch_size: int,
  total_places: int,
) -> dict[str, Any]:
  return {
    "item_ref": f"timeline-batch:{index}",
    "item_kind": "timeline_batch",
    "status": "pending",
    "batch_index": index,
    "batch_start": index * batch_size,
    "batch_count": min(batch_size, total_places - index * batch_size),
  }


def _items_from_job(job: dict[str, Any]) -> list[dict[str, Any]]:
  items = job.get("items")
  if items:
    return list(items)
  links = job.get("links") or []
  converted: list[dict[str, Any]] = []
  for link in links:
    post_url = link.get("post_url") or link.get("item_ref") or ""
    item_kind = "timeline_batch" if post_url.startswith("timeline-batch:") else "post_url"
    converted.append(
      {
        "item_ref": post_url,
        "item_kind": item_kind,
        "status": link.get("status", "pending"),
        "post_id": link.get("post_id"),
        "error_message": link.get("error_message"),
        "batch_index": link.get("batch_index"),
        "batch_start": link.get("batch_start"),
        "batch_count": link.get("batch_count"),
      }
    )
  return converted


def create_job(
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
  kind: str = JOB_KIND_LINK_INGEST,
  mark_visited: bool = False,
  username: str | None = None,
) -> str:
  del mark_visited  # carried on SFN event only for new jobs
  job_id = str(uuid.uuid4())
  now = datetime.now(timezone.utc)
  created_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
  item: dict[str, Any] = {
    "job_id": job_id,
    "user_id": user_id,
    "status": "running",
    "refresh": refresh,
    "kind": kind,
    "items": [_post_url_item(post_url) for post_url in post_urls],
    "version": 0,
    "created_at": created_at,
    "ttl": int((now + timedelta(days=JOB_TTL_DAYS)).timestamp()),
  }
  if username:
    item["username"] = username
  get_table("Jobs").put_item(Item=to_dynamo(item))
  return job_id


def create_timeline_job(
  *,
  user_id: str,
  s3_key: str,
  source_format: str,
  total_places: int,
  batch_size: int,
  home_latitude: float | None = None,
  home_longitude: float | None = None,
) -> str:
  """Create a timeline_import job with one item per batch."""
  if total_places < 1:
    raise ValueError("total_places must be >= 1")
  if batch_size < 1:
    raise ValueError("batch_size must be >= 1")

  batch_count = (total_places + batch_size - 1) // batch_size
  job_id = str(uuid.uuid4())
  now = datetime.now(timezone.utc)
  created_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
  items = [
    _timeline_batch_item(index, batch_size=batch_size, total_places=total_places)
    for index in range(batch_count)
  ]
  item: dict[str, Any] = {
    "job_id": job_id,
    "user_id": user_id,
    "status": "running",
    "refresh": False,
    "kind": JOB_KIND_TIMELINE_IMPORT,
    "s3_key": s3_key,
    "source_format": source_format,
    "total_places": total_places,
    "batch_size": batch_size,
    "items": items,
    "version": 0,
    "created_at": created_at,
    "ttl": int((now + timedelta(days=JOB_TTL_DAYS)).timestamp()),
  }
  if home_latitude is not None:
    item["home_latitude"] = home_latitude
  if home_longitude is not None:
    item["home_longitude"] = home_longitude
  get_table("Jobs").put_item(Item=to_dynamo(item))
  return job_id


def get_job(job_id: str, *, consistent_read: bool = False) -> dict[str, Any] | None:
  response = get_table("Jobs").get_item(
    Key={"job_id": job_id},
    ConsistentRead=consistent_read,
  )
  item = response.get("Item")
  if item is None:
    return None
  job = from_dynamo(item)
  if not job.get("items"):
    job["items"] = _items_from_job(job)
  return job


def get_active_job_for_user(
  user_id: str,
  *,
  kind: str | None = None,
) -> dict[str, Any] | None:
  """Newest running job for this user (optionally filtered by kind)."""
  table = get_table("Jobs")
  query_kwargs: dict[str, Any] = {
    "IndexName": JOBS_USER_CREATED_INDEX,
    "KeyConditionExpression": Key("user_id").eq(user_id),
    "ScanIndexForward": False,
  }
  if kind:
    query_kwargs["FilterExpression"] = Attr("kind").eq(kind) & Attr("status").eq("running")
  else:
    query_kwargs["FilterExpression"] = Attr("status").eq("running")

  response = table.query(**query_kwargs)
  items = response.get("Items") or []
  if not items:
    return None
  job = from_dynamo(items[0])
  if not job.get("items"):
    job["items"] = _items_from_job(job)
  return job


def list_jobs_for_user(user_id: str, limit: int = 25) -> list[dict[str, Any]]:
  """Newest jobs for this user, hydrated to the current item shape."""
  response = get_table("Jobs").query(
    IndexName=JOBS_USER_CREATED_INDEX,
    KeyConditionExpression=Key("user_id").eq(user_id),
    ScanIndexForward=False,
    Limit=limit,
  )
  jobs = [from_dynamo(item) for item in response.get("Items") or []]
  for job in jobs:
    if not job.get("items"):
      job["items"] = _items_from_job(job)
  return jobs


def set_execution_arn(job_id: str, execution_arn: str) -> None:
  get_table("Jobs").update_item(
    Key={"job_id": job_id},
    UpdateExpression="SET execution_arn = :arn",
    ExpressionAttributeValues={":arn": execution_arn},
  )


def mark_fetching(job_id: str, item_ref: str) -> None:
  update_item(job_id, item_ref, status="fetching")


def claim_pending_item(job_id: str, item_ref: str) -> bool:
  """Mark a pending item fetching. False if it was removed or already finished."""
  for attempt in range(_ITEM_UPDATE_ATTEMPTS):
    job = get_job(job_id, consistent_read=True)
    if job is None:
      return False

    items = list(job.get("items") or [])
    index = next((i for i, item in enumerate(items) if _item_ref(item) == item_ref), None)
    if index is None:
      return False

    status = items[index].get("status") or "pending"
    if status == "fetching":
      return True
    if status != "pending":
      return False

    item = dict(items[index])
    item["item_ref"] = item_ref
    item["status"] = "fetching"
    items[index] = item
    try:
      _commit_items(job_id, int(job.get("version") or 0), items)
      return True
    except ClientError as exc:
      if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
        raise
      time.sleep(random.uniform(0.015, 0.04 * (attempt + 1)))

  raise RuntimeError(f"Could not claim item on job {job_id} after concurrent retries")


def append_pending_urls(job_id: str, post_urls: list[str]) -> list[str]:
  """Add new pending URLs to a running job. Returns URLs that still need a worker run."""
  for attempt in range(_ITEM_UPDATE_ATTEMPTS):
    job = get_job(job_id, consistent_read=True)
    if job is None:
      raise KeyError(f"Job not found: {job_id}")
    if job.get("status") != "running":
      raise JobNotRunningError(job_id)

    items = list(job.get("items") or [])
    existing = {_item_ref(item): item for item in items}
    dispatch: list[str] = []
    changed = False
    for post_url in post_urls:
      current = existing.get(post_url)
      if current is None:
        item = _post_url_item(post_url)
        items.append(item)
        existing[post_url] = item
        dispatch.append(post_url)
        changed = True
      elif (current.get("status") or "pending") == "pending":
        dispatch.append(post_url)

    if not changed:
      return dispatch

    now = datetime.now(timezone.utc)
    try:
      _commit_items(
        job_id,
        int(job.get("version") or 0),
        items,
        extra_set="#ttl = :ttl",
        extra_values={
          ":ttl": int((now + timedelta(days=JOB_TTL_DAYS)).timestamp()),
          ":running": "running",
        },
        extra_names={"#status": "status", "#ttl": "ttl"},
        extra_condition="#status = :running",
      )
      return dispatch
    except ClientError as exc:
      if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
        raise
      latest = get_job(job_id, consistent_read=True)
      if latest is None:
        raise KeyError(f"Job not found: {job_id}") from exc
      if latest.get("status") != "running":
        raise JobNotRunningError(job_id) from exc
      time.sleep(random.uniform(0.015, 0.04 * (attempt + 1)))

  raise RuntimeError(f"Could not append items on job {job_id} after concurrent retries")


def remove_pending_item(job_id: str, item_ref: str) -> None:
  """Drop a pending item. Raises ValueError if it has already started."""
  for attempt in range(_ITEM_UPDATE_ATTEMPTS):
    job = get_job(job_id, consistent_read=True)
    if job is None:
      raise KeyError(f"Job not found: {job_id}")

    items = list(job.get("items") or [])
    index = next((i for i, item in enumerate(items) if _item_ref(item) == item_ref), None)
    if index is None:
      raise KeyError(f"Item not found on job {job_id}: {item_ref}")
    status = items[index].get("status") or "pending"
    if status != "pending":
      raise ValueError(f"Cannot remove {item_ref} in status {status}")

    items.pop(index)
    try:
      _commit_items(job_id, int(job.get("version") or 0), items)
      return
    except ClientError as exc:
      if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
        raise
      time.sleep(random.uniform(0.015, 0.04 * (attempt + 1)))

  raise RuntimeError(f"Could not remove item on job {job_id} after concurrent retries")


def update_item(
  job_id: str,
  item_ref: str,
  *,
  status: str,
  post_id: str | None = None,
  stats: dict[str, Any] | None = None,
  error_message: str | None = None,
) -> None:
  """Optimistic-lock item updates so concurrent Step Functions Map items don't clobber."""
  for attempt in range(_ITEM_UPDATE_ATTEMPTS):
    job = get_job(job_id, consistent_read=True)
    if job is None:
      raise KeyError(f"Job not found: {job_id}")

    items = list(job.get("items") or [])
    updated = False
    for index, item in enumerate(items):
      ref = _item_ref(item)
      if ref != item_ref:
        continue
      item = dict(item)
      item["item_ref"] = ref
      item["status"] = status
      if post_id is not None:
        item["post_id"] = post_id
      elif "post_id" in item and status == "fetching":
        item.pop("post_id", None)
      if stats is not None:
        item["stats"] = stats
      if error_message is not None:
        item["error_message"] = error_message
      elif status != "error":
        item.pop("error_message", None)
      items[index] = item
      updated = True
      break

    if not updated:
      raise KeyError(f"Item not found on job {job_id}: {item_ref}")

    try:
      _commit_items(job_id, int(job.get("version") or 0), items)
      return
    except ClientError as exc:
      if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
        raise
      time.sleep(random.uniform(0.015, 0.04 * (attempt + 1)))

  raise RuntimeError(f"Could not update item on job {job_id} after concurrent retries")


def update_link(
  job_id: str,
  *,
  post_url: str,
  status: str,
  post_id: str | None = None,
  stats: dict[str, Any] | None = None,
  error_message: str | None = None,
) -> None:
  """Backward-compatible alias for post URL items."""
  update_item(
    job_id,
    post_url,
    status=status,
    post_id=post_id,
    stats=stats,
    error_message=error_message,
  )


def mark_done(job_id: str) -> None:
  get_table("Jobs").update_item(
    Key={"job_id": job_id},
    UpdateExpression="SET #status = :done",
    ExpressionAttributeNames={"#status": "status"},
    ExpressionAttributeValues={":done": "done"},
  )


def try_mark_done(job_id: str) -> bool:
  """Mark done only when nothing is still pending or fetching."""
  for attempt in range(_ITEM_UPDATE_ATTEMPTS):
    job = get_job(job_id, consistent_read=True)
    if job is None:
      raise KeyError(f"Job not found: {job_id}")
    if job.get("status") == "done":
      return True
    if _has_in_flight(job):
      return False
    try:
      get_table("Jobs").update_item(
        Key={"job_id": job_id},
        UpdateExpression="SET #status = :done, version = :new_version",
        ConditionExpression=(
          "(attribute_not_exists(version) OR version = :old_version) AND #status = :running"
        ),
        ExpressionAttributeNames={"#status": "status"},
        ExpressionAttributeValues={
          ":done": "done",
          ":running": "running",
          ":new_version": int(job.get("version") or 0) + 1,
          ":old_version": int(job.get("version") or 0),
        },
      )
      return True
    except ClientError as exc:
      if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
        raise
      time.sleep(random.uniform(0.015, 0.04 * (attempt + 1)))
  return False
