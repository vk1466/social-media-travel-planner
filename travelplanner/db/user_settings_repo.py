"""Per-account settings stored in DynamoDB."""

from __future__ import annotations

from datetime import datetime, timezone

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


def record_processed_city(
  user_id: str,
  *,
  query: str,
  latitude: float,
  longitude: float,
) -> None:
  """Remember a city whose reels were sent through the pipeline."""
  name = query.strip()
  if not name:
    return
  now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
  cities = [
    city
    for city in list_processed_cities(user_id)
    if city["query"].casefold() != name.casefold()
  ]
  cities.insert(
    0,
    {
      "query": name,
      "latitude": latitude,
      "longitude": longitude,
      "processed_at": now,
    },
  )
  get_table("UserSettings").update_item(
    Key={"user_id": user_id},
    UpdateExpression="SET processed_cities = :cities",
    ExpressionAttributeValues=to_dynamo({":cities": cities[:50]}),
  )


def list_processed_cities(user_id: str) -> list[dict[str, str | float]]:
  """Cities already sent through the pipeline, newest first.

  Falls back to the last search anchor so a city processed before this list
  existed still shows up.
  """
  response = get_table("UserSettings").get_item(Key={"user_id": user_id})
  item = response.get("Item")
  if item is None:
    return []
  data = from_dynamo(item)
  raw = data.get("processed_cities")
  cities: list[dict[str, str | float]] = []
  if isinstance(raw, list):
    for entry in raw:
      if not isinstance(entry, dict):
        continue
      query = entry.get("query")
      if not isinstance(query, str) or not query.strip():
        continue
      latitude = entry.get("latitude")
      longitude = entry.get("longitude")
      cities.append(
        {
          "query": query.strip(),
          "latitude": float(latitude) if isinstance(latitude, (int, float)) else 0.0,
          "longitude": float(longitude) if isinstance(longitude, (int, float)) else 0.0,
          "processed_at": str(entry.get("processed_at") or ""),
        }
      )
  if cities:
    return cities
  anchor = get_city_search_anchor(user_id)
  if anchor is None:
    return []
  query, latitude, longitude = anchor
  return [
    {
      "query": query,
      "latitude": latitude,
      "longitude": longitude,
      "processed_at": "",
    }
  ]


def set_ingest_concurrency(user_id: str, ingest_concurrency: int) -> int:
  value = _clamp_concurrency(ingest_concurrency)
  get_table("UserSettings").put_item(
    Item=to_dynamo({"user_id": user_id, "ingest_concurrency": value}),
  )
  return value
