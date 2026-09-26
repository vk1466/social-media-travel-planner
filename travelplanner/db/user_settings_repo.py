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


def set_city_search_anchor(
  user_id: str,
  *,
  query: str,
  latitude: float,
  longitude: float,
) -> None:
  """Remember the city a For Travel search is mapping, without wiping other settings."""
  get_table("UserSettings").update_item(
    Key={"user_id": user_id},
    UpdateExpression=(
      "SET city_query = :query, city_latitude = :lat, city_longitude = :lng"
    ),
    ExpressionAttributeValues=to_dynamo(
      {":query": query, ":lat": latitude, ":lng": longitude}
    ),
  )


def get_city_search_anchor(user_id: str) -> tuple[str, float, float] | None:
  response = get_table("UserSettings").get_item(Key={"user_id": user_id})
  item = response.get("Item")
  if item is None:
    return None
  data = from_dynamo(item)
  query = data.get("city_query")
  latitude = data.get("city_latitude")
  longitude = data.get("city_longitude")
  if not isinstance(query, str) or not query.strip():
    return None
  if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
    return None
  return query.strip(), float(latitude), float(longitude)


def set_ingest_concurrency(user_id: str, ingest_concurrency: int) -> int:
  value = _clamp_concurrency(ingest_concurrency)
  get_table("UserSettings").put_item(
    Item=to_dynamo({"user_id": user_id, "ingest_concurrency": value}),
  )
  return value
