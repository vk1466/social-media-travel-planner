"""Instagram keyword search → reel URLs for city planning.

Uses Mindcase's Reels keyword search (the Instagram search results page),
then the normal link-ingest pipeline extracts places.
"""

from __future__ import annotations

import logging
from typing import Any

from travelplanner import settings
from travelplanner.clients.mindcase import search_reels

logger = logging.getLogger(__name__)


def _text(row: dict[str, Any], *keys: str) -> str | None:
  for key in keys:
    value = row.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return None


def search_city_reels(query: str, *, limit: int | None = None) -> list[dict[str, str | None]]:
  """Latest reels from Instagram search for a city or place name."""
  term = query.strip()
  if not term:
    raise ValueError("Enter a city or place")
  cap = limit if limit is not None else settings.city_reel_limit()
  if cap < 1:
    raise ValueError("limit must be >= 1")

  logger.info("instagram search query=%s limit=%d", term, cap)
  rows = search_reels(term, limit=cap)
  hits: list[dict[str, str | None]] = []
  seen: set[str] = set()
  for row in rows:
    url = _text(row, "postUrl", "post_url", "url")
    if not url or url in seen:
      continue
    seen.add(url)
    caption = _text(row, "caption")
    hits.append(
      {
        "post_url": url,
        "author": _text(row, "authorUsername", "username"),
        "caption": caption[:180] if caption else None,
        "thumbnail_url": _text(row, "image", "thumbnail", "displayUrl", "thumbnailUrl"),
      }
    )
    if len(hits) >= cap:
      break

  logger.info("instagram search query=%s reels=%d", term, len(hits))
  return hits
