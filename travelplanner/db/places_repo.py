from __future__ import annotations

from dataclasses import asdict

from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table
from travelplanner.models import Place, PlaceLocation


def place_to_dict(place: Place) -> dict:
  return asdict(place)


def place_from_dict(data: dict) -> Place:
  location_data = data.get("location", {})
  location = PlaceLocation(
    display_name=location_data["display_name"],
    continent=location_data.get("continent"),
    country=location_data.get("country"),
    country_code=location_data.get("country_code"),
    state_province=location_data.get("state_province"),
    city=location_data.get("city"),
    latitude=location_data.get("latitude"),
    longitude=location_data.get("longitude"),
    provider_place_id=location_data.get("provider_place_id"),
    osm_class=location_data.get("osm_class"),
    osm_type=location_data.get("osm_type"),
  )
  return Place(
    place_id=data["place_id"],
    display_name=data["display_name"],
    location=location,
    aliases=tuple(data.get("aliases", [])),
    category=data.get("category"),
    attributes=tuple(data.get("attributes", [])),
    details=tuple(data.get("details", [])),
    tips=tuple(data.get("tips", [])),
    source_post_ids=tuple(data.get("source_post_ids", [])),
    parent_place_id=data.get("parent_place_id"),
  )


def save_place(place: Place) -> None:
  table = get_table("Places")
  table.put_item(Item=to_dynamo(place_to_dict(place)))


def load_place(place_id: str) -> Place | None:
  table = get_table("Places")
  response = table.get_item(Key={"place_id": place_id})
  item = response.get("Item")
  if item is None:
    return None
  return place_from_dict(from_dynamo(item))


def load_all_places() -> list[Place]:
  table = get_table("Places")
  places: list[Place] = []
  scan_kwargs: dict = {}
  while True:
    response = table.scan(**scan_kwargs)
    for item in response.get("Items", []):
      places.append(place_from_dict(from_dynamo(item)))
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return sorted(places, key=lambda place: place.place_id)


def batch_get_places(place_ids: list[str]) -> list[Place]:
  if not place_ids:
    return []
  from travelplanner.db.client import get_dynamodb_resource
  from travelplanner.db.tables import table_name

  resource = get_dynamodb_resource()
  name = table_name("Places")
  places_by_id: dict[str, Place] = {}
  for offset in range(0, len(place_ids), 100):
    chunk = place_ids[offset : offset + 100]
    keys = [{"place_id": place_id} for place_id in chunk]
    response = resource.batch_get_item(RequestItems={name: {"Keys": keys}})
    for item in response.get("Responses", {}).get(name, []):
      place = place_from_dict(from_dynamo(item))
      places_by_id[place.place_id] = place
    unprocessed = response.get("UnprocessedKeys", {})
    if unprocessed.get(name):
      retry = resource.batch_get_item(RequestItems=unprocessed)
      for item in retry.get("Responses", {}).get(name, []):
        place = place_from_dict(from_dynamo(item))
        places_by_id[place.place_id] = place
  return [places_by_id[place_id] for place_id in place_ids if place_id in places_by_id]


def delete_all_places() -> int:
  table = get_table("Places")
  deleted = 0
  scan_kwargs: dict = {"ProjectionExpression": "place_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"place_id": item["place_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted
