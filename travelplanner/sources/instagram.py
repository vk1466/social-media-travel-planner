from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from typing import Any

from travelplanner import extract
from travelplanner.clients.ensembledata import fetch_post_info_and_comments
from travelplanner.clients.supadata import fetch_transcript
from travelplanner.extract import ReelBundle
from travelplanner.links import extract_instagram_shortcode
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.place_hints import PlatformPlace

logger = logging.getLogger(__name__)

HASHTAG_PATTERN = re.compile(r"#(\w+)")
TOP_COMMENT_LIMIT = 10


def _extract_caption(raw: dict[str, Any]) -> str:
  if caption := raw.get("caption"):
    return str(caption).strip()

  edges = raw.get("edge_media_to_caption", {}).get("edges", [])
  if edges:
    return str(edges[0].get("node", {}).get("text", "")).strip()
  return ""


def _extract_author_handle(raw: dict[str, Any]) -> str | None:
  owner = raw.get("owner") or raw.get("user") or {}
  username = owner.get("username")
  return str(username) if username else None


def _extract_media_kind(raw: dict[str, Any]) -> str:
  typename = raw.get("__typename", "")
  is_video = bool(raw.get("is_video"))
  product_type = raw.get("product_type")

  if typename == "GraphSidecar":
    return "carousel"
  if is_video and product_type == "clips":
    return "reel"
  if is_video:
    return "video"
  return "image"


def _extract_posted_at(raw: dict[str, Any]) -> str | None:
  timestamp = raw.get("taken_at_timestamp") or raw.get("taken_at")
  if timestamp is None:
    return None
  return datetime.fromtimestamp(int(timestamp), tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _extract_like_count(raw: dict[str, Any]) -> int | None:
  if "like_count" in raw:
    return int(raw["like_count"])

  for key in ("edge_media_preview_like", "edge_liked_by"):
    bucket = raw.get(key, {})
    if "count" in bucket:
      return int(bucket["count"])
  return None


def _extract_comment_count(raw: dict[str, Any]) -> int | None:
  if "comment_count" in raw:
    return int(raw["comment_count"])

  bucket = raw.get("edge_media_to_comment", {})
  if "count" in bucket:
    return int(bucket["count"])
  return None


def _extract_top_comments(raw: dict[str, Any]) -> tuple[str, ...]:
  comments: list[str] = []

  for comment in raw.get("comments", []):
    text = comment.get("text")
    if text:
      comments.append(str(text).strip())

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


def _extract_places(raw: dict[str, Any]) -> tuple[PlatformPlace, ...]:
  location = raw.get("location")
  if not location:
    return ()

  place_name = location.get("name") or location.get("short_name")
  if not place_name:
    return ()

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


def _extract_hashtags(caption: str) -> tuple[str, ...]:
  return tuple(match.group(1).lower() for match in HASHTAG_PATTERN.finditer(caption))


def _extract_thumbnail_url(raw: dict[str, Any]) -> str | None:
  for key in ("display_url", "thumbnail_src", "thumbnail_url"):
    value = raw.get(key)
    if value:
      return str(value)
  return None


def _trim_post_info(raw: dict[str, Any]) -> dict[str, Any]:
  caption = _extract_caption(raw)
  return {
    "caption": caption,
    "author_handle": _extract_author_handle(raw),
    "media_kind": _extract_media_kind(raw),
    "posted_at": _extract_posted_at(raw),
    "like_count": _extract_like_count(raw),
    "comment_count": _extract_comment_count(raw),
    "top_comments": _extract_top_comments(raw),
    "places": _extract_places(raw),
    "hashtags": _extract_hashtags(caption),
    "thumbnail_url": _extract_thumbnail_url(raw),
  }


def _canonical_media_url(shortcode: str, media_kind: str) -> str:
  if media_kind == "reel":
    return f"https://www.instagram.com/reel/{shortcode}/"
  return f"https://www.instagram.com/p/{shortcode}/"


def _location_tag(places: tuple[PlatformPlace, ...]) -> PlatformPlace | None:
  return places[0] if places else None


def fetch_instagram_post(post_url: str) -> SavedPost:
  shortcode = extract_instagram_shortcode(post_url)
  logger.info("instagram fetch start shortcode=%s", shortcode)
  raw = fetch_post_info_and_comments(code=shortcode, num_comments=TOP_COMMENT_LIMIT)
  trimmed = _trim_post_info(raw)

  media_kind = trimmed["media_kind"]
  transcript = (
    fetch_transcript(_canonical_media_url(shortcode, media_kind))
    if media_kind in {"video", "reel"}
    else None
  )
  logger.info(
    "instagram fetched shortcode=%s media_kind=%s has_transcript=%s location_tags=%d",
    shortcode,
    media_kind,
    bool(transcript),
    len(trimmed["places"]),
  )

  bundle = ReelBundle(
    caption=trimmed["caption"],
    hashtags=trimmed["hashtags"],
    top_comments=trimmed["top_comments"],
    location_tag=_location_tag(trimmed["places"]),
    transcript=transcript,
  )
  extracted_places = extract.fetch_places_from_reel(bundle)

  return SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, shortcode),
    post_url=post_url,
    platform=Platform.INSTAGRAM,
    extracted_places=extracted_places.places,
    reel_summary=extracted_places.reel_summary,
    fetched_at=datetime.now(tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    **trimmed,
  )
