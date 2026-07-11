from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from travelplanner.models import Platform, SavedPost, make_post_id, parse_post_id
from travelplanner.place_hints import ExtractedPlace, PlatformPlace

DEFAULT_DATA_DIR = Path("data/posts")


def _native_post_id(platform: Platform, post_id: str) -> str | None:
  """Accept a global or native post_id and return the filesystem native id.

  Returns None when a global id is invalid or its platform does not match
  the explicit platform argument (so lookup helpers can return False/None).
  """
  if ":" not in post_id:
    return post_id
  try:
    parsed_platform, native_id = parse_post_id(post_id)
  except ValueError:
    return None
  if parsed_platform != platform:
    return None
  return native_id


def _post_path(platform: Platform, post_id: str, data_dir: Path) -> Path | None:
  native_id = _native_post_id(platform, post_id)
  if native_id is None:
    return None
  return data_dir / platform.value / f"{native_id}.json"


def _extracted_place_from_dict(data: dict) -> ExtractedPlace:
  return ExtractedPlace(
    place_name=data["place_name"],
    city=data.get("city"),
    country=data.get("country"),
    state_province=data.get("state_province"),
    details=data.get("details"),
    tips=tuple(data.get("tips", [])),
    tags=tuple(data.get("tags", [])),
    parent_place_name=data.get("parent_place_name"),
  )


def _place_from_dict(data: dict) -> PlatformPlace:
  return PlatformPlace(
    place_name=data["place_name"],
    city=data.get("city"),
    country=data.get("country"),
    latitude=data.get("latitude"),
    longitude=data.get("longitude"),
  )


def post_to_dict(post: SavedPost) -> dict:
  data = asdict(post)
  data["platform"] = post.platform.value
  return data


def _post_from_dict(data: dict) -> SavedPost:
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
    places=tuple(_place_from_dict(place) for place in data.get("places", [])),
    extracted_places=tuple(
      _extracted_place_from_dict(place) for place in data.get("extracted_places", [])
    ),
    place_ids=tuple(data.get("place_ids", [])),
    thumbnail_url=data.get("thumbnail_url"),
    fetched_at=data.get("fetched_at"),
    reel_summary=data.get("reel_summary"),
  )


def save_post(post: SavedPost, data_dir: Path = DEFAULT_DATA_DIR) -> Path:
  _, native_id = parse_post_id(post.post_id)
  path = data_dir / post.platform.value / f"{native_id}.json"
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as handle:
    json.dump(post_to_dict(post), handle, indent=2, ensure_ascii=False)
    handle.write("\n")
  return path


def has_post(
  platform: Platform,
  post_id: str,
  data_dir: Path = DEFAULT_DATA_DIR,
) -> bool:
  path = _post_path(platform, post_id, data_dir)
  return path is not None and path.exists()


def load_post(
  platform: Platform,
  post_id: str,
  data_dir: Path = DEFAULT_DATA_DIR,
) -> SavedPost | None:
  path = _post_path(platform, post_id, data_dir)
  if path is None or not path.exists():
    return None
  with path.open(encoding="utf-8") as handle:
    return _post_from_dict(json.load(handle))


def load_all_posts(
  platform: Platform | None = None,
  data_dir: Path = DEFAULT_DATA_DIR,
) -> list[SavedPost]:
  if not data_dir.exists():
    return []

  platforms = [platform] if platform else [member for member in Platform]
  posts: list[SavedPost] = []

  for platform_member in platforms:
    platform_dir = data_dir / platform_member.value
    if not platform_dir.exists():
      continue
    for path in sorted(platform_dir.glob("*.json")):
      with path.open(encoding="utf-8") as handle:
        posts.append(_post_from_dict(json.load(handle)))

  return posts


def delete_post(
  platform: Platform,
  post_id: str,
  data_dir: Path = DEFAULT_DATA_DIR,
  *,
  places_data_dir: Path | None = None,
) -> bool:
  path = _post_path(platform, post_id, data_dir)
  if path is None or not path.exists():
    return False

  global_post_id = post_id if ":" in post_id else make_post_id(platform, post_id)
  path.unlink()

  if places_data_dir is not None:
    from travelplanner.places import unlink_post_from_places

    unlink_post_from_places(global_post_id, data_dir=places_data_dir)
  else:
    # Default place library — keep Post↔Place FK lists in sync on delete.
    try:
      from travelplanner.places import DEFAULT_PLACES_DIR, unlink_post_from_places

      unlink_post_from_places(global_post_id, data_dir=DEFAULT_PLACES_DIR)
    except Exception:
      pass

  return True


def delete_all_posts(data_dir: Path = DEFAULT_DATA_DIR) -> int:
  """Remove every saved post JSON file. Returns the number deleted."""
  if not data_dir.exists():
    return 0

  deleted = 0
  for platform in Platform:
    platform_dir = data_dir / platform.value
    if not platform_dir.exists():
      continue
    for path in platform_dir.glob("*.json"):
      path.unlink()
      deleted += 1
  return deleted
