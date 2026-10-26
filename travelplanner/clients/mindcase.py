"""Mindcase Instagram HTTP helpers (same API the extractor uses).

POST a job, poll ``/jobs/{id}/results`` until completed. Fail-hard when the
key is missing so ingest records an error instead of saving an empty post.
"""

from __future__ import annotations

import json
import logging
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import certifi

from travelplanner import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.mindcase.co/v1"
POSTS_RUN_PATH = "/data/instagram/posts/run"
GOOGLE_MAPS_PLACES_RUN_PATH = "/data/google-maps/places/run"
POLL_INTERVAL_SECONDS = 2.0
MAX_WAIT_SECONDS = 180
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_USER_AGENT = "social-media-travel-planner"


def api_key() -> str:
  value = settings.mindcase_api_key()
  if not value:
    raise RuntimeError(
      "Missing MINDCASE_API_KEY environment variable. "
      "Copy .env.example to .env and set the same Mindcase key as the extractor."
    )
  return value


def fetch_post(
  *,
  post_url: str | None = None,
  shortcode: str | None = None,
  timeout_seconds: float = 6.0,
) -> dict[str, Any]:
  """One Instagram post/reel by URL (preferred) or shortcode."""
  api_key()
  url = (post_url or "").strip()
  code = (shortcode or "").strip()
  if not code and url:
    try:
      from travelplanner.links import extract_instagram_shortcode

      code = extract_instagram_shortcode(url)
    except Exception:
      pass

  urls_to_try: list[str] = []
  if url:
    urls_to_try.append(url)
  elif code:
    urls_to_try.append(f"https://www.instagram.com/reel/{code}/")
  else:
    raise ValueError("post_url or shortcode is required")

  try:
    rows = fetch_posts(post_urls=urls_to_try, max_wait_seconds=timeout_seconds)
  except RuntimeError as exc:
    msg = str(exc).lower()
    if "timed out" in msg or "timeout" in msg:
      raise RuntimeError(
        f"Instagram post {code or url} could not be fetched (private or deleted post): {exc}"
      ) from exc
    raise

  if not rows:
    raise RuntimeError(f"Mindcase returned no post for {url or code} (private or deleted post)")

  post_row = rows[0]
  # Check if row is empty/all nulls (which Mindcase returns for deleted or private posts)
  has_content = any(
    post_row.get(k) is not None
    for k in (
      "caption",
      "authorUsername",
      "authorName",
      "videoUrl",
      "image",
      "likes",
      "plays",
      "views",
    )
  )
  if not has_content:
    raise RuntimeError(f"Instagram post {code or url} returned empty data (private or deleted post)")

  return post_row


def search_reels(query: str, *, limit: int) -> list[dict[str, Any]]:
  """Instagram keyword search over Reels (Mindcase posts ``query`` mode)."""
  term = query.strip()
  if not term:
    raise ValueError("query is required")
  if limit < 1:
    raise ValueError("limit must be >= 1")
  # About 10–12 reels per page, and Mindcase caps pages at 8.
  pages = min(8, max(1, (limit + 9) // 10))
  return _run_job(POSTS_RUN_PATH, {"query": term, "maxPages": pages})


def fetch_posts_for_handle(username: str, *, max_results: int) -> list[dict[str, Any]]:
  """Recent public posts for a username (newest first when the API orders that way)."""
  handle = username.strip().lstrip("@")
  if not handle:
    raise ValueError("username is required")
  if max_results < 1:
    raise ValueError("max_results must be >= 1")
  return fetch_posts(handle=handle, max_results=max_results)


def fetch_posts(
  *,
  post_urls: list[str] | None = None,
  handle: str | None = None,
  max_results: int | None = None,
  max_wait_seconds: float | None = None,
) -> list[dict[str, Any]]:
  params: dict[str, Any] = {}
  urls = [url.strip() for url in (post_urls or []) if url and url.strip()]
  if urls:
    params["postUrls"] = urls
  if handle:
    params["handles"] = handle.strip().lstrip("@")
  if max_results is not None:
    params["maxResults"] = max_results
  if not params:
    raise ValueError("post_urls or handle is required")
  return _run_job(POSTS_RUN_PATH, params, max_wait_seconds=max_wait_seconds)


def fetch_google_maps_places(
  *,
  keywords: list[str] | None = None,
  location: str | None = None,
  place_urls: list[str] | None = None,
  max_results: int = 1,
) -> list[dict[str, Any]]:
  """Google Maps place listings via Mindcase (hours, phone, website, categories)."""
  wanted = max(1, max_results)
  params: dict[str, Any] = {"maxResults": wanted, "maxImages": 0}
  urls = [url.strip() for url in (place_urls or []) if url and url.strip()]
  if urls:
    params["placeUrls"] = urls
  else:
    terms = [term.strip() for term in (keywords or []) if term and term.strip()]
    if not terms:
      raise ValueError("keywords or place_urls is required")
    params["keywords"] = ", ".join(terms)
    loc = (location or "").strip()
    if loc:
      params["location"] = loc
  return _run_job(GOOGLE_MAPS_PLACES_RUN_PATH, params, ready_row_count=wanted)


def _run_job(
  path: str,
  params: dict[str, Any],
  *,
  ready_row_count: int | None = None,
  max_wait_seconds: float | None = None,
) -> list[dict[str, Any]]:
  started = _request("POST", path, {"params": params})
  rows = _rows_if_ready(started, ready_row_count=ready_row_count)
  if rows is not None:
    return rows

  job_id = _job_id(started)
  if not job_id:
    raise RuntimeError(
      f"Mindcase run returned no job_id: {json.dumps(started)[:400]}"
    )
  logger.info("mindcase job started job_id=%s path=%s", job_id, path)

  wait_limit = max_wait_seconds if max_wait_seconds is not None else MAX_WAIT_SECONDS
  deadline = time.monotonic() + wait_limit
  poll_interval = 0.5 if wait_limit <= 8 else (1.0 if wait_limit <= 15 else POLL_INTERVAL_SECONDS)
  while time.monotonic() < deadline:
    time.sleep(poll_interval)
    results = _request("GET", f"/jobs/{urllib.parse.quote(job_id, safe='')}/results")
    status = str(results.get("status") or "").lower()
    logger.info(
      "mindcase job poll job_id=%s status=%s rows=%s",
      job_id,
      status or "unknown",
      results.get("row_count"),
    )
    rows = _rows_if_ready(results, ready_row_count=ready_row_count)
    if rows is not None:
      return rows
    if status in {"failed", "error", "cancelled"}:
      detail = results.get("message") or results.get("error") or "no details"
      raise RuntimeError(f"Mindcase job {job_id} {status}: {detail}")
  raise RuntimeError(f"Mindcase job {job_id} timed out after {wait_limit:.1f}s")


def _data_rows(payload: dict[str, Any]) -> list[dict[str, Any]] | None:
  raw = payload.get("data")
  if not isinstance(raw, list):
    return None
  return [row for row in raw if isinstance(row, dict)]


def _rows_if_ready(
  payload: dict[str, Any],
  *,
  ready_row_count: int | None = None,
) -> list[dict[str, Any]] | None:
  status = str(payload.get("status") or "").lower()
  rows = _data_rows(payload)
  if status == "completed":
    return rows if rows is not None else []
  if (
    ready_row_count is not None
    and ready_row_count > 0
    and rows is not None
    and len(rows) >= ready_row_count
  ):
    return rows
  return None


def _job_id(payload: dict[str, Any]) -> str:
  for key in ("job_id", "jobId", "id"):
    value = payload.get(key)
    if value:
      return str(value).strip()
  return ""


def _request(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
  url = f"{API_BASE}{path}"
  headers = {
    "Authorization": f"Bearer {api_key()}",
    "Accept": "application/json",
    "User-Agent": _USER_AGENT,
  }
  data: bytes | None = None
  if body is not None:
    headers["Content-Type"] = "application/json"
    data = json.dumps(body).encode("utf-8")
  max_retries = 3
  for attempt in range(max_retries + 1):
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
      with urllib.request.urlopen(request, timeout=30, context=_SSL_CONTEXT) as resp:
        text = resp.read().decode("utf-8")
        status = resp.status
        break
    except urllib.error.HTTPError as exc:
      if exc.code == 429 and attempt < max_retries:
        retry_after = exc.headers.get("Retry-After") if exc.headers else None
        delay = float(retry_after) if retry_after and retry_after.isdigit() else 1.5 * (attempt + 1)
        logger.warning(
          "Mindcase 429 rate limit path=%s attempt=%d/%d retrying in %.1fs",
          path,
          attempt + 1,
          max_retries,
          delay,
        )
        time.sleep(delay)
        continue
      text = exc.read().decode("utf-8", errors="replace")
      parsed = _parse_json(text)
      detail = ""
      if isinstance(parsed, dict):
        detail = str(parsed.get("error") or parsed.get("message") or "")
      raise RuntimeError(
        f"Mindcase {exc.code} {method} {path}: {detail or text[:240]}"
      ) from exc

  parsed = _parse_json(text)
  if not isinstance(parsed, dict):
    raise RuntimeError(f"Mindcase {status} non-object JSON: {text[:240]}")
  return parsed


def _parse_json(text: str) -> Any:
  try:
    return json.loads(text)
  except json.JSONDecodeError:
    return None
