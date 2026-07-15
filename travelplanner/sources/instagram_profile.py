"""List recent public Instagram posts for a username (EnsembleData).

Fetches only post URLs — full ingest still goes through the normal pipeline.
"""

from __future__ import annotations

import logging
import math
import re
from typing import Any

from travelplanner import settings
from travelplanner.clients.ensembledata import fetch_user_info, fetch_user_posts

logger = logging.getLogger(__name__)

_USERNAME_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")
_MAX_CHUNK = 20


def limit_to_depth_chunk(limit: int) -> tuple[int, int]:
  """Map a desired post count to EnsembleData depth × chunk_size.

  Returns enough capacity for `limit` posts; callers must still truncate.
  """
  if limit < 1:
    raise ValueError("limit must be >= 1")
  if limit <= _MAX_CHUNK:
    return 1, limit
  depth = math.ceil(limit / _MAX_CHUNK)
  return depth, _MAX_CHUNK


def normalize_instagram_username(raw: str) -> str:
  value = raw.strip().lstrip("@")
  if value.startswith("https://") or value.startswith("http://"):
    # https://www.instagram.com/username/ → username
    parts = value.rstrip("/").split("/")
    value = parts[-1] if parts else ""
    value = value.split("?")[0].lstrip("@")
  if not value or not _USERNAME_RE.match(value):
    raise ValueError("Enter a valid Instagram username")
  return value


def _extract_user_id(payload: dict[str, Any]) -> int:
  """Pull numeric user id from EnsembleData user_info shapes."""
  candidates: list[Any] = [
    payload.get("pk"),
    payload.get("id"),
    payload.get("user_id"),
    payload.get("pk_id"),
  ]
  user = payload.get("user")
  if isinstance(user, dict):
    candidates.extend(
      [
        user.get("pk"),
        user.get("id"),
        user.get("user_id"),
        user.get("pk_id"),
      ]
    )
  data = payload.get("data")
  if isinstance(data, dict):
    candidates.extend(
      [
        data.get("pk"),
        data.get("id"),
        data.get("user_id"),
      ]
    )
    nested = data.get("user")
    if isinstance(nested, dict):
      candidates.extend([nested.get("pk"), nested.get("id"), nested.get("user_id")])

  for value in candidates:
    if value is None or value == "":
      continue
    try:
      return int(value)
    except (TypeError, ValueError):
      continue
  raise ValueError("Could not resolve Instagram user id for that username")


def _unwrap_post_item(item: dict[str, Any]) -> dict[str, Any]:
  """EnsembleData user_posts often returns GraphQL edges: `{node: {...}}`."""
  nested = item.get("node")
  if isinstance(nested, dict):
    return nested
  return item


def _post_nodes(payload: dict[str, Any]) -> list[dict[str, Any]]:
  raw: list[Any] = []
  if isinstance(payload.get("posts"), list):
    raw = payload["posts"]
  elif isinstance(payload.get("items"), list):
    raw = payload["items"]
  else:
    data = payload.get("data")
    if isinstance(data, dict):
      if isinstance(data.get("posts"), list):
        raw = data["posts"]
      elif isinstance(data.get("items"), list):
        raw = data["items"]
    elif isinstance(data, list):
      raw = data

  nodes: list[dict[str, Any]] = []
  for item in raw:
    if not isinstance(item, dict):
      continue
    nodes.append(_unwrap_post_item(item))
  return nodes


def _shortcode_from_node(node: dict[str, Any]) -> str | None:
  for key in ("code", "shortcode"):
    value = node.get(key)
    if value:
      return str(value)
  media = node.get("media")
  if isinstance(media, dict):
    for key in ("code", "shortcode"):
      value = media.get(key)
      if value:
        return str(value)
  return None


def _media_kind_from_node(node: dict[str, Any]) -> str:
  product_type = str(node.get("product_type") or "").lower()
  if product_type == "clips":
    return "reel"
  typename = str(node.get("__typename") or "")
  if typename == "GraphVideo" or node.get("is_video") is True:
    # Reels and feed videos both use /reel/ when product_type is clips; else /p/
    if product_type == "clips":
      return "reel"
    return "video"
  # Instagram media_type: 1 image, 2 video, 8 carousel
  if node.get("media_type") == 2:
    return "video"
  return "image"


def _canonical_url(shortcode: str, media_kind: str) -> str:
  if media_kind == "reel":
    return f"https://www.instagram.com/reel/{shortcode}/"
  return f"https://www.instagram.com/p/{shortcode}/"


def list_recent_post_urls(
  username: str,
  *,
  limit: int | None = None,
) -> list[str]:
  """Return up to `limit` latest public post URLs for a username (newest first)."""
  handle = normalize_instagram_username(username)
  post_limit = limit if limit is not None else settings.instagram_profile_post_limit()
  depth, chunk_size = limit_to_depth_chunk(post_limit)

  info = fetch_user_info(username=handle)
  user_id = _extract_user_id(info if isinstance(info, dict) else {})
  logger.info(
    "instagram profile resolve username=%s user_id=%s limit=%d depth=%d chunk_size=%d",
    handle,
    user_id,
    post_limit,
    depth,
    chunk_size,
  )

  posts_payload = fetch_user_posts(user_id=user_id, depth=depth, chunk_size=chunk_size)
  nodes = _post_nodes(posts_payload if isinstance(posts_payload, dict) else {})

  urls: list[str] = []
  seen: set[str] = set()
  for node in nodes:
    shortcode = _shortcode_from_node(node)
    if not shortcode or shortcode in seen:
      continue
    seen.add(shortcode)
    urls.append(_canonical_url(shortcode, _media_kind_from_node(node)))
    if len(urls) >= post_limit:
      break

  logger.info("instagram profile listed username=%s posts=%d", handle, len(urls))
  return urls
