"""Trim helpers for Instagram media payloads."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from travelplanner.place_hints import PlatformPlace

HASHTAG_PATTERN = re.compile(r"#(\w+)")
TOP_COMMENT_LIMIT = 10
MAX_SLIDE_IMAGE_URLS = 10


def extract_caption(raw: dict[str, Any]) -> str:
  if caption := raw.get("caption"):
    return str(caption).strip()

  edges = raw.get("edge_media_to_caption", {}).get("edges", [])
  if edges:
    return str(edges[0].get("node", {}).get("text", "")).strip()
  return ""


def extract_author_handle(raw: dict[str, Any]) -> str | None:
  for key in ("authorUsername", "username"):
    value = raw.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  owner = raw.get("owner") or raw.get("user") or {}
  if not isinstance(owner, dict):
    return None
  username = owner.get("username")
  return str(username) if username else None


def extract_media_kind(raw: dict[str, Any]) -> str:
  typename = str(raw.get("__typename") or "")
  is_video = bool(raw.get("is_video"))
  product_type = str(raw.get("product_type") or "").lower()

  if typename == "GraphSidecar":
    return "carousel"
  if is_video and product_type == "clips":
    return "reel"
  if is_video:
    return "video"
  if typename:
    return "image"

  type_name = str(raw.get("type") or "").lower()
  content_format = str(raw.get("contentFormat") or "").lower()
  post_url = str(raw.get("postUrl") or "").lower()
  blob = f"{type_name} {content_format}"
  if "carousel" in blob or "sidecar" in blob or "album" in blob:
    return "carousel"
  if "/reel/" in post_url or "reel" in blob or product_type == "clips":
    return "reel"
  if type_name == "video" or content_format == "video" or raw.get("videoUrl"):
    return "video"
  return "image"


def extract_posted_at(raw: dict[str, Any]) -> str | None:
  timestamp = raw.get("taken_at_timestamp") or raw.get("taken_at")
  if timestamp is not None:
    return datetime.fromtimestamp(int(timestamp), tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
  posted = raw.get("posted")
  if posted:
    return _iso_to_utc(str(posted))
  return None


def _iso_to_utc(value: str) -> str | None:
  text = value.strip()
  if not text:
    return None
  if text.endswith("Z"):
    text = text[:-1] + "+00:00"
  try:
    parsed = datetime.fromisoformat(text)
  except ValueError:
    return None
  if parsed.tzinfo is None:
    parsed = parsed.replace(tzinfo=UTC)
  return parsed.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def extract_like_count(raw: dict[str, Any]) -> int | None:
  if "like_count" in raw:
    return int(raw["like_count"])
  likes = raw.get("likes")
  if isinstance(likes, (int, float)) and not isinstance(likes, bool):
    return int(likes)

  for key in ("edge_media_preview_like", "edge_liked_by"):
    bucket = raw.get(key, {})
    if isinstance(bucket, dict) and "count" in bucket:
      return int(bucket["count"])
  return None


def extract_comment_count(raw: dict[str, Any]) -> int | None:
  if "comment_count" in raw:
    return int(raw["comment_count"])
  comments = raw.get("comments")
  if isinstance(comments, (int, float)) and not isinstance(comments, bool):
    return int(comments)

  bucket = raw.get("edge_media_to_comment", {})
  if isinstance(bucket, dict) and "count" in bucket:
    return int(bucket["count"])
  return None


def extract_top_comments(raw: dict[str, Any]) -> tuple[str, ...]:
  comments: list[str] = []

  first = raw.get("firstComment")
  if isinstance(first, str) and first.strip():
    comments.append(first.strip())

  recent = raw.get("recentComments")
  if isinstance(recent, list):
    for item in recent:
      text = _comment_text(item)
      if text:
        comments.append(text)

  raw_comments = raw.get("comments")
  if isinstance(raw_comments, list):
    for comment in raw_comments:
      text = _comment_text(comment)
      if text:
        comments.append(text)

  edges = raw.get("edge_media_to_comment", {}).get("edges", [])
  for edge in edges:
    text = edge.get("node", {}).get("text")
    if text:
      comments.append(str(text).strip())

  deduped: list[str] = []
  seen: set[str] = set()
  for comment in comments:
    if comment and comment not in seen:
      seen.add(comment)
      deduped.append(comment)
    if len(deduped) >= TOP_COMMENT_LIMIT:
      break
  return tuple(deduped)


def _comment_text(item: Any) -> str | None:
  if isinstance(item, str) and item.strip():
    return item.strip()
  if not isinstance(item, dict):
    return None
  for key in ("commentText", "text", "comment"):
    value = item.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return None


def extract_places(raw: dict[str, Any]) -> tuple[PlatformPlace, ...]:
  location = raw.get("location")
  if isinstance(location, str) and location.strip():
    return (PlatformPlace(place_name=location.strip()),)
  if isinstance(location, dict):
    place_name = location.get("name") or location.get("short_name")
    if place_name:
      city = location.get("city")
      country = location.get("country")
      latitude = location.get("lat") or location.get("latitude")
      longitude = location.get("lng") or location.get("longitude")
      return (
        PlatformPlace(
          place_name=str(place_name),
          city=str(city) if city else None,
          country=str(country) if country else None,
          latitude=float(latitude) if latitude is not None else None,
          longitude=float(longitude) if longitude is not None else None,
        ),
      )

  location_name = raw.get("locationName")
  if isinstance(location_name, str) and location_name.strip():
    return (PlatformPlace(place_name=location_name.strip()),)
  return ()


def extract_hashtags(caption: str) -> tuple[str, ...]:
  return tuple(match.group(1).lower() for match in HASHTAG_PATTERN.finditer(caption))


def extract_thumbnail_url(raw: dict[str, Any]) -> str | None:
  for key in ("display_url", "thumbnail_src", "thumbnail_url", "image"):
    value = raw.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return None


def extract_hashtags_from_raw(raw: dict[str, Any], caption: str) -> tuple[str, ...]:
  tags = raw.get("hashtags")
  collected: list[str] = []
  if isinstance(tags, str):
    tags = [part.strip() for part in tags.split(",")]
  if isinstance(tags, list):
    for item in tags:
      text = str(item).strip().lstrip("#").lower()
      if text:
        collected.append(text)
  if collected:
    return tuple(dict.fromkeys(collected))
  return extract_hashtags(caption)


def extract_slide_image_urls(
  raw: dict[str, Any],
  *,
  max_slides: int = MAX_SLIDE_IMAGE_URLS,
) -> list[str]:
  """Ordered image URLs for OCR: carousel children, else cover image."""
  urls: list[str] = []
  seen: set[str] = set()

  def _add(url: str | None) -> None:
    if not url or url in seen or len(urls) >= max_slides:
      return
    seen.add(url)
    urls.append(url)

  edges = (raw.get("edge_sidecar_to_children") or {}).get("edges") or []
  for edge in edges:
    if len(urls) >= max_slides:
      break
    node = edge.get("node") or {}
    for key in ("display_url", "thumbnail_src", "thumbnail_url"):
      value = node.get(key)
      if value:
        _add(str(value))
        break

  carousel_images = raw.get("carouselImages")
  if isinstance(carousel_images, list):
    for item in carousel_images:
      if isinstance(item, str):
        _add(item.strip())

  slide_media = raw.get("carouselSlideMediaUrls")
  if isinstance(slide_media, list):
    for item in slide_media:
      if isinstance(item, str):
        _add(item.strip())
      elif isinstance(item, dict):
        for key in ("url", "image", "mediaUrl", "display_url"):
          value = item.get(key)
          if isinstance(value, str) and value.strip():
            _add(value.strip())
            break

  if urls:
    return urls

  cover = extract_thumbnail_url(raw)
  if cover:
    return [cover]
  return []


def trim_post_info(raw: dict[str, Any]) -> dict[str, Any]:
  caption = extract_caption(raw)
  return {
    "caption": caption,
    "author_handle": extract_author_handle(raw),
    "media_kind": extract_media_kind(raw),
    "posted_at": extract_posted_at(raw),
    "like_count": extract_like_count(raw),
    "comment_count": extract_comment_count(raw),
    "top_comments": extract_top_comments(raw),
    "places": extract_places(raw),
    "hashtags": extract_hashtags_from_raw(raw, caption),
    "thumbnail_url": extract_thumbnail_url(raw),
  }


def extract_video_url(raw: dict[str, Any]) -> str | None:
  """Direct MP4 URL from a Mindcase (videoUrl) or GraphQL (video_url) payload."""
  for key in ("video_url", "videoUrl"):
    value = raw.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return None


def canonical_media_url(shortcode: str, media_kind: str) -> str:
  if media_kind == "reel":
    return f"https://www.instagram.com/reel/{shortcode}/"
  return f"https://www.instagram.com/p/{shortcode}/"


def location_tag(places: tuple[PlatformPlace, ...]) -> PlatformPlace | None:
  return places[0] if places else None
