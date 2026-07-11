from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from boto3.dynamodb.conditions import Key

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table

PlaceSource = Literal["from_post", "manual"]


def _now_iso() -> str:
  return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def link_user_place(
  user_id: str,
  place_id: str,
  *,
  source: PlaceSource = "from_post",
  added_at: str | None = None,
) -> None:
  table = get_table("UserPlaces")
  existing = table.get_item(Key={"user_id": user_id, "place_id": place_id}).get("Item")
  # Prefer keeping manual if already manual; otherwise upsert.
  if existing is not None:
    existing_source = existing.get("source", "from_post")
    if existing_source == "manual" and source == "from_post":
      return
  table.put_item(
    Item=to_dynamo(
      {
        "user_id": user_id,
        "place_id": place_id,
        "source": source,
        "added_at": added_at
        or (from_dynamo(existing).get("added_at") if existing else None)
        or _now_iso(),
      }
    )
  )


def unlink_user_place(user_id: str, place_id: str) -> bool:
  table = get_table("UserPlaces")
  response = table.get_item(Key={"user_id": user_id, "place_id": place_id})
  if response.get("Item") is None:
    return False
  table.delete_item(Key={"user_id": user_id, "place_id": place_id})
  return True


def sync_places_from_post(user_id: str, place_ids: tuple[str, ...] | list[str]) -> None:
  for place_id in place_ids:
    link_user_place(user_id, place_id, source="from_post")


def list_user_place_ids(user_id: str) -> list[str]:
  table = get_table("UserPlaces")
  items: list[dict] = []
  query_kwargs = {"KeyConditionExpression": Key("user_id").eq(user_id)}
  while True:
    response = table.query(**query_kwargs)
    items.extend(from_dynamo(item) for item in response.get("Items", []))
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    query_kwargs["ExclusiveStartKey"] = last_key
  items.sort(key=lambda item: item.get("added_at") or "", reverse=True)
  return [item["place_id"] for item in items]


def delete_all_user_places_for_user(user_id: str) -> int:
  place_ids = list_user_place_ids(user_id)
  table = get_table("UserPlaces")
  for place_id in place_ids:
    table.delete_item(Key={"user_id": user_id, "place_id": place_id})
  return len(place_ids)


def delete_all_user_places() -> int:
  table = get_table("UserPlaces")
  deleted = 0
  scan_kwargs: dict = {"ProjectionExpression": "user_id, place_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"user_id": item["user_id"], "place_id": item["place_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted
