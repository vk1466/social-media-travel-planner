"""Instagram keyword search → a diverse set of reel URLs for one city.

Several travel phrasings are searched (20 reels each). Jev then keeps the
reels that add the most new places, up to the ingest limit.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from travelplanner import settings
from travelplanner.clients.mindcase import search_reels
from travelplanner.sources.reel_rank import select_diverse_reels

logger = logging.getLogger(__name__)

# {city} is the user's place name.
SEARCH_TEMPLATES: tuple[str, ...] = (
  "top things to do in {city}",
  "3 days in {city}",
  "day trips from {city}",
  "hidden gems in {city}",
  "best neighborhoods in {city}",
  "{city} itinerary",
)


def _text(row: dict[str, Any], *keys: str) -> str | None:
  for key in keys:
    value = row.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return None


def _hits_for_query(query: str, *, limit: int) -> list[dict[str, str | None]]:
  logger.info("instagram search query=%s limit=%d", query, limit)
  rows = search_reels(query, limit=limit)
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
        "search_query": query,
      }
    )
    if len(hits) >= limit:
      break
  logger.info("instagram search query=%s reels=%d", query, len(hits))
  return hits


def search_city_reels(query: str, *, limit: int | None = None) -> list[dict[str, str | None]]:
  """Reels for a city, chosen so the set covers different places."""
  city = query.strip()
  if not city:
    raise ValueError("Enter a city or place")
  final_limit = limit if limit is not None else settings.city_reel_limit()
  if final_limit < 1:
    raise ValueError("limit must be >= 1")
  per_query = settings.city_query_reel_limit()
  phrases = [template.format(city=city) for template in SEARCH_TEMPLATES]

  errors: list[Exception] = []

  def one(phrase: str) -> list[dict[str, str | None]]:
    try:
      return _hits_for_query(phrase, limit=per_query)
    except Exception as exc:
      logger.exception("instagram search failed query=%s", phrase)
      errors.append(exc)
      return []

  with ThreadPoolExecutor(max_workers=len(phrases)) as pool:
    batches = list(pool.map(one, phrases))

  merged: list[dict[str, str | None]] = []
  seen: set[str] = set()
  for batch in batches:
    for hit in batch:
      url = hit.get("post_url")
      if not url or url in seen:
        continue
      seen.add(url)
      merged.append(hit)

  if not merged:
    if errors:
      raise errors[0]
    return []

  logger.info("instagram search city=%s candidates=%d", city, len(merged))
  chosen = select_diverse_reels(merged, city=city, limit=final_limit)
  logger.info("instagram search city=%s chosen=%d", city, len(chosen))
  return chosen
