"""Per-account settings stored in DynamoDB."""

from __future__ import annotations

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table

DEFAULT_LINK_INGEST_CONCURRENCY = 1
MAX_LINK_INGEST_CONCURRENCY = 10


def _clamp_concurrency(value: int) -> int:
  return max(DEFAULT_LINK_INGEST_CONCURRENCY, min(MAX_LINK_INGEST_CONCURRENCY, int(value)))


def get_ingest_concurrency(user_id: str) -> int:
  response = get_table("UserSettings").get_item(Key={"user_id": user_id})
  item = response.get("Item")
  if item is None:
    return DEFAULT_LINK_INGEST_CONCURRENCY
  raw = from_dynamo(item).get("ingest_concurrency")
  if raw is None:
    return DEFAULT_LINK_INGEST_CONCURRENCY
  try:
    return _clamp_concurrency(int(raw))
  except (TypeError, ValueError):
    return DEFAULT_LINK_INGEST_CONCURRENCY


def set_ingest_concurrency(user_id: str, ingest_concurrency: int) -> int:
  value = _clamp_concurrency(ingest_concurrency)
  get_table("UserSettings").put_item(
    Item=to_dynamo({"user_id": user_id, "ingest_concurrency": value}),
  )
  return value
