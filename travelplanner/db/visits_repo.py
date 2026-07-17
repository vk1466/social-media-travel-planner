from __future__ import annotations

from dataclasses import asdict

from boto3.dynamodb.conditions import Key

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table
from travelplanner.models import Visit


def visit_to_dict(visit: Visit) -> dict:
  return asdict(visit)


def visit_from_dict(data: dict) -> Visit:
  return Visit(
    visit_id=data["visit_id"],
    place_id=data["place_id"],
    place_name=data["place_name"],
    visited_from=data.get("visited_from"),
    visited_to=data.get("visited_to"),
    notes=data.get("notes"),
    created_at=data.get("created_at"),
    user_id=data.get("user_id", ""),
    source=data.get("source") or "manual",
  )


def save_visit(visit: Visit) -> None:
  if not visit.user_id:
    raise ValueError("visit.user_id is required")
  table = get_table("Visits")
  table.put_item(Item=to_dynamo(visit_to_dict(visit)))


def load_visit(user_id: str, visit_id: str) -> Visit | None:
  table = get_table("Visits")
  response = table.get_item(Key={"user_id": user_id, "visit_id": visit_id})
  item = response.get("Item")
  if item is None:
    return None
  return visit_from_dict(from_dynamo(item))


def load_all_visits(user_id: str) -> list[Visit]:
  table = get_table("Visits")
  visits: list[Visit] = []
  query_kwargs = {"KeyConditionExpression": Key("user_id").eq(user_id)}
  while True:
    response = table.query(**query_kwargs)
    for item in response.get("Items", []):
      visits.append(visit_from_dict(from_dynamo(item)))
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    query_kwargs["ExclusiveStartKey"] = last_key
  return visits


def delete_visit(user_id: str, visit_id: str) -> bool:
  if load_visit(user_id, visit_id) is None:
    return False
  table = get_table("Visits")
  table.delete_item(Key={"user_id": user_id, "visit_id": visit_id})
  return True


def delete_all_visits(user_id: str | None = None) -> int:
  table = get_table("Visits")
  deleted = 0
  if user_id is not None:
    for visit in load_all_visits(user_id):
      table.delete_item(Key={"user_id": user_id, "visit_id": visit.visit_id})
      deleted += 1
    return deleted

  scan_kwargs: dict = {"ProjectionExpression": "user_id, visit_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"user_id": item["user_id"], "visit_id": item["visit_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted


def delete_visits_by_source(user_id: str, source: str) -> int:
  """Delete visits for one user that match source. Returns deleted count."""
  table = get_table("Visits")
  deleted = 0
  for visit in load_all_visits(user_id):
    if visit.source != source:
      continue
    table.delete_item(Key={"user_id": user_id, "visit_id": visit.visit_id})
    deleted += 1
  return deleted
