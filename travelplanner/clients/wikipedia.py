"""Wikipedia REST / MediaWiki helpers for place-facts enrichment."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

_USER_AGENT = "social-media-travel-planner/1.0 (place facts; https://github.com/)"
_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
_API_URL = "https://en.wikipedia.org/w/api.php"


@dataclass(frozen=True)
class WikipediaSummary:
  title: str
  extract: str
  url: str
  latitude: float | None = None
  longitude: float | None = None
  description: str | None = None


def _get_json(url: str, *, timeout: float = 15.0) -> dict[str, Any] | None:
  request = urllib.request.Request(
    url,
    headers={"User-Agent": _USER_AGENT, "Accept": "application/json"},
    method="GET",
  )
  try:
    with urllib.request.urlopen(request, timeout=timeout) as response:
      payload = json.loads(response.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
    logger.warning("wikipedia request failed url=%s error=%s", url, exc)
    return None
  return payload if isinstance(payload, dict) else None


def _coords_from_summary(payload: dict[str, Any]) -> tuple[float | None, float | None]:
  coords = payload.get("coordinates")
  if isinstance(coords, dict) and "lat" in coords and "lon" in coords:
    try:
      return float(coords["lat"]), float(coords["lon"])
    except (TypeError, ValueError):
      return None, None
  return None, None


def fetch_summary(title: str) -> WikipediaSummary | None:
  """Fetch a short page summary by title. Fail-soft → None."""
  cleaned = title.strip()
  if not cleaned:
    return None
  encoded = urllib.parse.quote(cleaned.replace(" ", "_"), safe="")
  payload = _get_json(_SUMMARY_URL.format(title=encoded))
  if payload is None:
    return None
  if payload.get("type") == "disambiguation":
    return None
  extract = str(payload.get("extract") or "").strip()
  page_title = str(payload.get("title") or cleaned).strip()
  if not extract or not page_title:
    return None
  content_urls = payload.get("content_urls") or {}
  desktop = content_urls.get("desktop") if isinstance(content_urls, dict) else None
  url = ""
  if isinstance(desktop, dict):
    url = str(desktop.get("page") or "").strip()
  if not url:
    url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(page_title.replace(' ', '_'))}"
  lat, lon = _coords_from_summary(payload)
  description = payload.get("description")
  return WikipediaSummary(
    title=page_title,
    extract=extract,
    url=url,
    latitude=lat,
    longitude=lon,
    description=str(description).strip() if description else None,
  )


def geosearch(
  latitude: float,
  longitude: float,
  *,
  radius_m: int = 10_000,
  limit: int = 5,
) -> list[str]:
  """Nearby Wikipedia page titles. Fail-soft → []."""
  params = urllib.parse.urlencode(
    {
      "action": "query",
      "list": "geosearch",
      "gscoord": f"{latitude}|{longitude}",
      "gsradius": max(10, min(int(radius_m), 10_000)),
      "gslimit": max(1, min(int(limit), 20)),
      "format": "json",
    }
  )
  payload = _get_json(f"{_API_URL}?{params}")
  if payload is None:
    return []
  query = payload.get("query") if isinstance(payload, dict) else None
  hits = query.get("geosearch") if isinstance(query, dict) else None
  if not isinstance(hits, list):
    return []
  titles: list[str] = []
  for hit in hits:
    if not isinstance(hit, dict):
      continue
    title = hit.get("title")
    if isinstance(title, str) and title.strip():
      titles.append(title.strip())
  return titles


def search_titles(query: str, *, limit: int = 5) -> list[str]:
  """Title search. Fail-soft → []."""
  cleaned = query.strip()
  if not cleaned:
    return []
  params = urllib.parse.urlencode(
    {
      "action": "query",
      "list": "search",
      "srsearch": cleaned,
      "srlimit": max(1, min(int(limit), 20)),
      "format": "json",
    }
  )
  payload = _get_json(f"{_API_URL}?{params}")
  if payload is None:
    return []
  query_block = payload.get("query") if isinstance(payload, dict) else None
  hits = query_block.get("search") if isinstance(query_block, dict) else None
  if not isinstance(hits, list):
    return []
  titles: list[str] = []
  for hit in hits:
    if not isinstance(hit, dict):
      continue
    title = hit.get("title")
    if isinstance(title, str) and title.strip():
      titles.append(title.strip())
  return titles
