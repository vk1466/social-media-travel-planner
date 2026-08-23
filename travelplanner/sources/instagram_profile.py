"""List recent public Instagram posts for a username (Mindcase).

Fetches only post URLs — full ingest still goes through the normal pipeline.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from travelplanner import settings
from travelplanner.clients.mindcase import fetch_posts_for_handle

logger = logging.getLogger(__name__)

_USERNAME_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def normalize_instagram_username(raw: str) -> str:
  value = raw.strip().lstrip("@")
  if value.startswith("https://") or value.startswith("http://"):
    parts = value.rstrip("/").split("/")
    value = parts[-1] if parts else ""
    value = value.split("?")[0].lstrip("@")
  if not value or not _USERNAME_RE.match(value):
    raise ValueError("Enter a valid Instagram username")
  return value


def _post_url_from_row(row: dict[str, Any]) -> str | None:
  url = row.get("postUrl") or row.get("post_url") or row.get("url")
  if isinstance(url, str) and url.strip():
    return url.strip()
  return None


def list_recent_post_urls(
  username: str,
  *,
  limit: int | None = None,
) -> list[str]:
  """Return up to `limit` latest public post URLs for a username (newest first)."""
  handle = normalize_instagram_username(username)
  post_limit = limit if limit is not None else settings.instagram_profile_post_limit()
  logger.info("instagram profile list username=%s limit=%d", handle, post_limit)

  rows = fetch_posts_for_handle(handle, max_results=post_limit)
  urls: list[str] = []
  seen: set[str] = set()
  for row in rows:
    url = _post_url_from_row(row)
    if not url or url in seen:
      continue
    seen.add(url)
    urls.append(url)
    if len(urls) >= post_limit:
      break

  logger.info("instagram profile listed username=%s posts=%d", handle, len(urls))
  return urls
