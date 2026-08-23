"""OMDb HTTP helpers. Key is optional; callers fail-soft when unset."""

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

API_BASE = "https://www.omdbapi.com/"
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_USER_AGENT = "social-media-travel-planner"


def api_key() -> str | None:
  return settings.omdb_api_key()


def by_imdb_id(imdb_id: str) -> dict[str, Any] | None:
  """Lookup a title by IMDb id. None when key missing or OMDb errors."""
  key = api_key()
  imdb_id = imdb_id.strip()
  if not key or not imdb_id:
    return None
  query = urllib.parse.urlencode({"apikey": key, "i": imdb_id, "plot": "short"})
  req = urllib.request.Request(
    f"{API_BASE}?{query}",
    headers={"User-Agent": _USER_AGENT},
  )
  try:
    with urllib.request.urlopen(req, timeout=20, context=_SSL_CONTEXT) as resp:
      payload = json.loads(resp.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
    logger.warning("omdb GET failed imdb_id=%s error=%s", imdb_id, exc)
    return None
  if not isinstance(payload, dict) or payload.get("Response") == "False":
    logger.info("omdb miss imdb_id=%s error=%s", imdb_id, payload.get("Error") if isinstance(payload, dict) else None)
    return None
  return payload
