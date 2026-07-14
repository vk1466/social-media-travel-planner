from __future__ import annotations

from dataclasses import asdict

from boto3.dynamodb.conditions import Key

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import SOURCE_POST_INDEX, get_table
from travelplanner.models import PlaceCandidate
from travelplanner.place_hints import PlaceMention


def _hints_from_dict(data: dict) -> PlaceMention:
  return PlaceMention(
    place_name=data["place_name"],
    city=data.get("city"),
    country=data.get("country"),
    state_province=data.get("state_province"),
    latitude=data.get("latitude"),
    longitude=data.get("longitude"),
    details=data.get("details"),
    tips=tuple(data.get("tips", [])),
    tags=tuple(data.get("tags", [])),
    parent_place_name=data.get("parent_place_name"),
  )


def candidate_to_dict(candidate: PlaceCandidate) -> dict:
  return asdict(candidate)


def candidate_from_dict(data: dict) -> PlaceCandidate:
  hints_data = data.get("hints") or {"place_name": data["place_name"]}
  return PlaceCandidate(
    candidate_id=data["candidate_id"],
    source_post_id=data["source_post_id"],
    place_name=data["place_name"],
    status=data["status"],
    hints=_hints_from_dict(hints_data),
    last_tried_at=data.get("last_tried_at"),
    resolved_place_id=data.get("resolved_place_id"),
  )


def save_candidate(candidate: PlaceCandidate) -> None:
  table = get_table("PlaceCandidates")
  table.put_item(Item=to_dynamo(candidate_to_dict(candidate)))


def load_candidate(candidate_id: str) -> PlaceCandidate | None:
  table = get_table("PlaceCandidates")
  response = table.get_item(Key={"candidate_id": candidate_id})
  item = response.get("Item")
  if item is None:
    return None
  return candidate_from_dict(from_dynamo(item))


def load_candidates_for_post(source_post_id: str) -> list[PlaceCandidate]:
  table = get_table("PlaceCandidates")
  candidates: list[PlaceCandidate] = []
  query_kwargs = {
    "IndexName": SOURCE_POST_INDEX,
    "KeyConditionExpression": Key("source_post_id").eq(source_post_id),
  }
  while True:
    response = table.query(**query_kwargs)
    for item in response.get("Items", []):
      candidates.append(candidate_from_dict(from_dynamo(item)))
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    query_kwargs["ExclusiveStartKey"] = last_key
  return sorted(candidates, key=lambda candidate: candidate.candidate_id)


def load_open_candidates(
  *,
  statuses: tuple[str, ...] = ("unresolved", "low_confidence"),
  source_post_id: str | None = None,
) -> list[PlaceCandidate]:
  """Load candidates still needing retry/review. Scans when not scoped to a post."""
  status_set = set(statuses)
  if source_post_id is not None:
    return [
      candidate
      for candidate in load_candidates_for_post(source_post_id)
      if candidate.status in status_set
    ]

  table = get_table("PlaceCandidates")
  candidates: list[PlaceCandidate] = []
  scan_kwargs: dict = {}
  while True:
    response = table.scan(**scan_kwargs)
    for item in response.get("Items", []):
      candidate = candidate_from_dict(from_dynamo(item))
      if candidate.status in status_set:
        candidates.append(candidate)
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return sorted(candidates, key=lambda candidate: candidate.candidate_id)


def delete_all_candidates() -> int:
  table = get_table("PlaceCandidates")
  deleted = 0
  scan_kwargs: dict = {"ProjectionExpression": "candidate_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"candidate_id": item["candidate_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted
