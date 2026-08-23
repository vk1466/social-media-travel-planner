"""TMDB v3 HTTP helpers. Key is optional; callers fail-soft when unset."""

from __future__ import annotations

import json
import logging
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import certifi

from travelplanner import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.themoviedb.org/3"
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_USER_AGENT = "social-media-travel-planner"


def api_key() -> str | None:
  return settings.tmdb_api_key()


def _get_json(path: str, params: dict[str, Any]) -> dict[str, Any] | None:
  key = api_key()
  if not key:
    return None
  query = urllib.parse.urlencode({**params, "api_key": key})
  url = f"{API_BASE}{path}?{query}"
  req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
  try:
    with urllib.request.urlopen(req, timeout=20, context=_SSL_CONTEXT) as resp:
      return json.loads(resp.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
    logger.warning("tmdb GET failed path=%s error=%s", path, exc)
    return None


def _best_search_hit(
  results: Any,
  title: str,
  name_keys: tuple[str, ...],
) -> dict[str, Any] | None:
  if not results:
    return None
  needle = title.casefold()
  for item in results:
    if not isinstance(item, dict):
      continue
    for key in name_keys:
      if str(item.get(key) or "").casefold() == needle:
        return item
  first = results[0]
  return first if isinstance(first, dict) else None


def search_movie(title: str, year: int | None = None) -> dict[str, Any] | None:
  """Return the best search hit for title (+ year), or None."""
  title = title.strip()
  if not title:
    return None
  params: dict[str, Any] = {"query": title}
  if year is not None:
    params["year"] = year
  payload = _get_json("/search/movie", params)
  results = payload.get("results") if isinstance(payload, dict) else None
  return _best_search_hit(results, title, ("title", "original_title"))


def search_tv(title: str, year: int | None = None) -> dict[str, Any] | None:
  """Return the best TV search hit for title (+ first-air year), or None."""
  title = title.strip()
  if not title:
    return None
  params: dict[str, Any] = {"query": title}
  if year is not None:
    params["first_air_date_year"] = year
  payload = _get_json("/search/tv", params)
  results = payload.get("results") if isinstance(payload, dict) else None
  return _best_search_hit(results, title, ("name", "original_name"))


def movie_details(tmdb_id: int) -> dict[str, Any] | None:
  """Movie details with release dates, IMDb id, and reviews."""
  payload = _get_json(
    f"/movie/{tmdb_id}",
    {"append_to_response": "release_dates,external_ids,reviews"},
  )
  return payload if isinstance(payload, dict) else None


def tv_details(tmdb_id: int) -> dict[str, Any] | None:
  """TV details with content ratings, IMDb id, and reviews."""
  payload = _get_json(
    f"/tv/{tmdb_id}",
    {"append_to_response": "content_ratings,external_ids,reviews"},
  )
  return payload if isinstance(payload, dict) else None
