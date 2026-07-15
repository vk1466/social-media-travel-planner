from __future__ import annotations

from dataclasses import asdict

from travelplanner.models import Platform, SavedPost, make_post_id, parse_post_id
from travelplanner.place_hints import ExtractedPlace, PlatformPlace
from travelplanner.db.serialize import from_dynamo, to_dynamo
from travelplanner.db.tables import get_table


def _extracted_place_from_dict(data: dict) -> ExtractedPlace:
  return ExtractedPlace(
    place_name=data["place_name"],
    city=data.get("city"),
    country=data.get("country"),
    state_province=data.get("state_province"),
    details=data.get("details"),
    tips=tuple(data.get("tips", [])),
    category=data.get("category"),
    attributes=tuple(data.get("attributes", [])),
    parent_place_name=data.get("parent_place_name"),
  )


def _platform_place_from_dict(data: dict) -> PlatformPlace:
  return PlatformPlace(
    place_name=data["place_name"],
    city=data.get("city"),
    country=data.get("country"),
    state_province=data.get("state_province"),
    latitude=data.get("latitude"),
    longitude=data.get("longitude"),
  )


def post_to_dict(post: SavedPost) -> dict:
  data = asdict(post)
  data["platform"] = post.platform.value
  return data


def post_from_dict(data: dict) -> SavedPost:
  platform = Platform(data["platform"])
  raw_post_id = data["post_id"]
  post_id = (
    raw_post_id
    if ":" in raw_post_id
    else make_post_id(platform, raw_post_id)
  )
  return SavedPost(
    post_id=post_id,
    post_url=data["post_url"],
    platform=platform,
    media_kind=data["media_kind"],
    caption=data["caption"],
    hashtags=tuple(data.get("hashtags", [])),
    author_handle=data.get("author_handle"),
    posted_at=data.get("posted_at"),
    like_count=data.get("like_count"),
    comment_count=data.get("comment_count"),
    top_comments=tuple(data.get("top_comments", [])),
    places=tuple(_platform_place_from_dict(place) for place in data.get("places", [])),
    extracted_places=tuple(
      _extracted_place_from_dict(place) for place in data.get("extracted_places", [])
    ),
    place_ids=tuple(data.get("place_ids", [])),
    thumbnail_url=data.get("thumbnail_url"),
    fetched_at=data.get("fetched_at"),
    reel_summary=data.get("reel_summary"),
  )


def save_post(post: SavedPost) -> None:
  table = get_table("Posts")
  table.put_item(Item=to_dynamo(post_to_dict(post)))


def has_post(platform: Platform, post_id: str) -> bool:
  return load_post(platform, post_id) is not None


def load_post(platform: Platform, post_id: str) -> SavedPost | None:
  try:
    global_post_id = post_id if ":" in post_id else make_post_id(platform, post_id)
    parsed_platform, _ = parse_post_id(global_post_id)
  except ValueError:
    return None
  if parsed_platform != platform:
    return None

  table = get_table("Posts")
  response = table.get_item(Key={"post_id": global_post_id})
  item = response.get("Item")
  if item is None:
    return None
  return post_from_dict(from_dynamo(item))


def load_post_by_id(post_id: str) -> SavedPost | None:
  try:
    platform, _ = parse_post_id(post_id)
  except ValueError:
    return None
  return load_post(platform, post_id)


def load_all_posts(platform: Platform | None = None) -> list[SavedPost]:
  table = get_table("Posts")
  posts: list[SavedPost] = []
  scan_kwargs: dict = {}
  while True:
    response = table.scan(**scan_kwargs)
    for item in response.get("Items", []):
      post = post_from_dict(from_dynamo(item))
      if platform is None or post.platform == platform:
        posts.append(post)
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return sorted(posts, key=lambda post: post.post_id)


def batch_get_posts(post_ids: list[str]) -> list[SavedPost]:
  if not post_ids:
    return []
  from travelplanner.db.client import get_dynamodb_resource
  from travelplanner.db.tables import table_name

  resource = get_dynamodb_resource()
  name = table_name("Posts")
  posts_by_id: dict[str, SavedPost] = {}
  for offset in range(0, len(post_ids), 100):
    chunk = post_ids[offset : offset + 100]
    keys = [{"post_id": post_id} for post_id in chunk]
    response = resource.batch_get_item(RequestItems={name: {"Keys": keys}})
    for item in response.get("Responses", {}).get(name, []):
      post = post_from_dict(from_dynamo(item))
      posts_by_id[post.post_id] = post
    unprocessed = response.get("UnprocessedKeys", {})
    if unprocessed.get(name):
      retry = resource.batch_get_item(RequestItems=unprocessed)
      for item in retry.get("Responses", {}).get(name, []):
        post = post_from_dict(from_dynamo(item))
        posts_by_id[post.post_id] = post
  return [posts_by_id[post_id] for post_id in post_ids if post_id in posts_by_id]


def delete_post(platform: Platform, post_id: str, *, unlink_places: bool = True) -> bool:
  try:
    global_post_id = post_id if ":" in post_id else make_post_id(platform, post_id)
    parsed_platform, _ = parse_post_id(global_post_id)
  except ValueError:
    return False
  if parsed_platform != platform:
    return False

  if load_post(platform, global_post_id) is None:
    return False

  table = get_table("Posts")
  table.delete_item(Key={"post_id": global_post_id})

  if unlink_places:
    try:
      from travelplanner.places import unlink_post_from_places

      unlink_post_from_places(global_post_id)
    except Exception:
      pass
  return True


def delete_all_posts() -> int:
  table = get_table("Posts")
  deleted = 0
  scan_kwargs: dict = {"ProjectionExpression": "post_id"}
  while True:
    response = table.scan(**scan_kwargs)
    with table.batch_writer() as batch:
      for item in response.get("Items", []):
        batch.delete_item(Key={"post_id": item["post_id"]})
        deleted += 1
    last_key = response.get("LastEvaluatedKey")
    if not last_key:
      break
    scan_kwargs["ExclusiveStartKey"] = last_key
  return deleted
