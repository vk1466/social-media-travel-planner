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


def fetch_post(*, post_url: str | None = None, shortcode: str | None = None) -> dict[str, Any]:
  """One Instagram post/reel by URL (preferred) or shortcode."""
  url = (post_url or "").strip()
  if not url:
    code = (shortcode or "").strip()
    if not code:
      raise ValueError("post_url or shortcode is required")
    url = f"https://www.instagram.com/p/{code}/"
  rows = fetch_posts(post_urls=[url])
  if not rows:
    raise RuntimeError(f"Mindcase returned no post for {url}")
  return rows[0]


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
  return _run_job(POSTS_RUN_PATH, params)


def _run_job(path: str, params: dict[str, Any]) -> list[dict[str, Any]]:
  started = _request("POST", path, {"params": params})
  rows = _rows_if_completed(started)
  if rows is not None:
    return rows

  job_id = _job_id(started)
  if not job_id:
    raise RuntimeError(
      f"Mindcase run returned no job_id: {json.dumps(started)[:400]}"
    )
  logger.info("mindcase job started job_id=%s path=%s", job_id, path)

  deadline = time.monotonic() + MAX_WAIT_SECONDS
  while time.monotonic() < deadline:
    time.sleep(POLL_INTERVAL_SECONDS)
    results = _request("GET", f"/jobs/{urllib.parse.quote(job_id, safe='')}/results")
    status = str(results.get("status") or "").lower()
    logger.info(
      "mindcase job poll job_id=%s status=%s rows=%s",
      job_id,
      status or "unknown",
      results.get("row_count"),
    )
    rows = _rows_if_completed(results)
    if rows is not None:
      return rows
    if status in {"failed", "error", "cancelled"}:
      detail = results.get("message") or results.get("error") or "no details"
      raise RuntimeError(f"Mindcase job {job_id} {status}: {detail}")
  raise RuntimeError(f"Mindcase job {job_id} timed out after {MAX_WAIT_SECONDS}s")


def _rows_if_completed(payload: dict[str, Any]) -> list[dict[str, Any]] | None:
  status = str(payload.get("status") or "").lower()
  if status != "completed":
    return None
  raw = payload.get("data")
  if not isinstance(raw, list):
    return []
  return [row for row in raw if isinstance(row, dict)]


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
  request = urllib.request.Request(url, data=data, headers=headers, method=method)
  try:
    with urllib.request.urlopen(request, timeout=30, context=_SSL_CONTEXT) as resp:
      text = resp.read().decode("utf-8")
      status = resp.status
  except urllib.error.HTTPError as exc:
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
