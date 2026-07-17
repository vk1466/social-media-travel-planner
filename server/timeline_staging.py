"""S3 staging for Timeline cluster payloads (presign + load)."""

from __future__ import annotations

import json
import uuid
from typing import Any

import boto3

from travelplanner import settings


def _bucket() -> str:
  bucket = settings.timeline_imports_bucket()
  if not bucket:
    raise RuntimeError("TIMELINE_IMPORTS_BUCKET is required for Timeline import")
  return bucket


def _s3():
  return boto3.client("s3", region_name=settings.dynamodb_region())


def make_object_key(user_id: str) -> str:
  return f"timeline/{user_id}/{uuid.uuid4().hex}.json"


def presign_put_url(*, user_id: str, expires_in: int = 900) -> dict[str, str]:
  """Return {url, key} for a client PUT of clustered visits JSON."""
  key = make_object_key(user_id)
  url = _s3().generate_presigned_url(
    "put_object",
    Params={
      "Bucket": _bucket(),
      "Key": key,
      "ContentType": "application/json",
    },
    ExpiresIn=expires_in,
  )
  return {"url": url, "key": key}


def put_json(key: str, payload: dict[str, Any]) -> None:
  """Server-side write (tests / local)."""
  body = json.dumps(payload).encode("utf-8")
  _s3().put_object(
    Bucket=_bucket(),
    Key=key,
    Body=body,
    ContentType="application/json",
  )


def load_payload(key: str) -> dict[str, Any]:
  response = _s3().get_object(Bucket=_bucket(), Key=key)
  raw = response["Body"].read()
  data = json.loads(raw.decode("utf-8"))
  if not isinstance(data, dict):
    raise ValueError("Timeline staging payload must be a JSON object")
  return data


def load_clusters(key: str) -> list[dict[str, Any]]:
  payload = load_payload(key)
  clusters = payload.get("clusters") or payload.get("visits") or []
  if not isinstance(clusters, list):
    raise ValueError("Timeline staging payload missing clusters list")
  return clusters


def batch_slice(key: str, *, start: int, count: int) -> list[dict[str, Any]]:
  clusters = load_clusters(key)
  return clusters[start : start + count]
