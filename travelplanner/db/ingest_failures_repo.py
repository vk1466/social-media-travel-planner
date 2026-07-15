"""Persist ingest failures durably so no fetch/data error is silently lost.

Keyed by a stable hash of `(user_id, post_url)` — retries update the same row and
increment `attempts`; a later clean ingest clears it via `clear_ingest_failure`.
"""

from __future__ import annotations

import hashlib
from dataclasses import asdict
from datetime import datetime, timezone

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table
from travelplanner.models import IngestFailure


def _now_iso() -> str:
  return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_failure_id(user_id: str, post_url: str) -> str:
  digest = hashlib.sha256(f"{user_id}\n{post_url}".encode()).hexdigest()
  return digest[:32]


def failure_to_dict(failure: IngestFailure) -> dict:
  return asdict(failure)


def failure_from_dict(data: dict) -> IngestFailure:
  return IngestFailure(
    failure_id=data["failure_id"],
    post_url=data["post_url"],
    user_id=data.get("user_id", ""),
    status=data["status"],
    stage=data["stage"],
    error_message=data.get("error_message"),
    post_id=data.get("post_id"),
    attempts=int(data.get("attempts", 1)),
    first_failed_at=data.get("first_failed_at"),
    last_failed_at=data.get("last_failed_at"),
  )


def save_failure(failure: IngestFailure) -> None:
  get_table("IngestFailures").put_item(Item=to_dynamo(failure_to_dict(failure)))


def load_failure(failure_id: str) -> IngestFailure | None:
  response = get_table("IngestFailures").get_item(Key={"failure_id": failure_id})
  item = response.get("Item")
  if item is None:
    return None
  return failure_from_dict(from_dynamo(item))


def record_ingest_failure(
  *,
  post_url: str,
  user_id: str,
  status: str,
  stage: str,
  error_message: str | None = None,
  post_id: str | None = None,
) -> IngestFailure:
  """Upsert a failure for `(user_id, post_url)`, bumping attempts on retries."""
  failure_id = make_failure_id(user_id, post_url)
  now = _now_iso()
  existing = load_failure(failure_id)
  first_failed_at = existing.first_failed_at if existing is not None else now
  attempts = (existing.attempts + 1) if existing is not None else 1
  failure = IngestFailure(
    failure_id=failure_id,
    post_url=post_url,
    user_id=user_id,
    status=status,
    stage=stage,
    error_message=error_message,
    post_id=post_id,
    attempts=attempts,
    first_failed_at=first_failed_at,
    last_failed_at=now,
  )
  save_failure(failure)
  return failure


def clear_ingest_failure(*, post_url: str, user_id: str) -> bool:
  """Drop any outstanding failure once the link ingests cleanly. Idempotent."""
  failure_id = make_failure_id(user_id, post_url)
  response = get_table("IngestFailures").delete_item(
    Key={"failure_id": failure_id},
    ReturnValues="ALL_OLD",
  )
  return response.get("Attributes") is not None


def list_failures(*, user_id: str | None = None) -> list[IngestFailure]:
  """List outstanding failures, optionally scoped to one user. Scans (low volume)."""
  table = get_table("IngestFailures")
  failures: list[IngestFailure] = []
  scan_kwargs: dict = {}
  while True:
    response = table.scan(**scan_kwargs)
    for item in response.get("Items", []):
      failure = failure_from_dict(from_dynamo(item))
      if user_id is None or failure.user_id == user_id:
        failures.append(failure)
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return sorted(failures, key=lambda failure: failure.last_failed_at or "")


def delete_all_failures() -> int:
  table = get_table("IngestFailures")
  deleted = 0
  scan_kwargs: dict = {"ProjectionExpression": "failure_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"failure_id": item["failure_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted
