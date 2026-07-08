from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from travelplanner.models import ExtractedPlace, Place, Platform, SavedPost

DEFAULT_DATA_DIR = Path("data/posts")


def _post_path(platform: Platform, post_id: str, data_dir: Path) -> Path:
  return data_dir / platform.value / f"{post_id}.json"


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


def _place_from_dict(data: dict) -> Place:
  return Place(
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
  return SavedPost(
    post_id=data["post_id"],
    post_url=data["post_url"],
    platform=Platform(data["platform"]),
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
    fetched_at=data.get("fetched_at"),
  )


def save_post(post: SavedPost, data_dir: Path = DEFAULT_DATA_DIR) -> Path:
  path = _post_path(post.platform, post.post_id, data_dir)
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
  return _post_path(platform, post_id, data_dir).exists()


def load_post(
  platform: Platform,
  post_id: str,
  data_dir: Path = DEFAULT_DATA_DIR,
) -> SavedPost | None:
  path = _post_path(platform, post_id, data_dir)
  if not path.exists():
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
) -> bool:
  path = _post_path(platform, post_id, data_dir)
  if not path.exists():
    return False
  path.unlink()
  return True
