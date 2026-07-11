from __future__ import annotations

from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table


def _now_iso() -> str:
  return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def link_user_post(user_id: str, post_id: str, *, added_at: str | None = None) -> None:
  table = get_table("UserPosts")
  table.put_item(
    Item=to_dynamo(
      {
        "user_id": user_id,
        "post_id": post_id,
        "added_at": added_at or _now_iso(),
      }
    )
  )


def unlink_user_post(user_id: str, post_id: str) -> bool:
  table = get_table("UserPosts")
  response = table.get_item(Key={"user_id": user_id, "post_id": post_id})
  if response.get("Item") is None:
    return False
  table.delete_item(Key={"user_id": user_id, "post_id": post_id})
  return True


def user_has_post(user_id: str, post_id: str) -> bool:
  table = get_table("UserPosts")
  response = table.get_item(Key={"user_id": user_id, "post_id": post_id})
  return response.get("Item") is not None


def list_user_post_ids(user_id: str) -> list[str]:
  table = get_table("UserPosts")
  items: list[dict] = []
  query_kwargs = {
    "KeyConditionExpression": Key("user_id").eq(user_id),
  }
  while True:
    response = table.query(**query_kwargs)
    items.extend(from_dynamo(item) for item in response.get("Items", []))
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    query_kwargs["ExclusiveStartKey"] = last_key
  items.sort(key=lambda item: item.get("added_at") or "", reverse=True)
  return [item["post_id"] for item in items]


def delete_all_user_posts_for_user(user_id: str) -> int:
  post_ids = list_user_post_ids(user_id)
  table = get_table("UserPosts")
  for post_id in post_ids:
    table.delete_item(Key={"user_id": user_id, "post_id": post_id})
  return len(post_ids)


def count_user_links_for_post(post_id: str) -> int:
  """Scan UserPosts for references to post_id (admin/GC). Acceptable at small scale."""
  table = get_table("UserPosts")
  count = 0
  scan_kwargs: dict = {
    "FilterExpression": "post_id = :post_id",
    "ExpressionAttributeValues": {":post_id": post_id},
    "ProjectionExpression": "user_id",
  }
  while True:
    response = table.scan(**scan_kwargs)
    count += len(response.get("Items", []))
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return count


def delete_all_user_posts() -> int:
  table = get_table("UserPosts")
  deleted = 0
  scan_kwargs: dict = {"ProjectionExpression": "user_id, post_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"user_id": item["user_id"], "post_id": item["post_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted
