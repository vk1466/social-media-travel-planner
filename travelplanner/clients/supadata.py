from __future__ import annotations

import time
from typing import Any

from supadata import Supadata
from supadata.errors import SupadataError
from supadata.types import BatchJob, Transcript

from travelplanner import settings

POLL_INTERVAL_SECONDS = 2
RATE_LIMIT_BACKOFF_SECONDS = 5
MAX_WAIT_SECONDS = 180


def get_client() -> Supadata:
  return Supadata(api_key=settings.supadata_api_key())


def _is_rate_limited(exc: Exception) -> bool:
  return isinstance(exc, SupadataError) and exc.error == "limit-exceeded"


def _transcript_to_text(transcript: Transcript) -> str | None:
  content = transcript.content
  if isinstance(content, str):
    text = content.strip()
    return text or None

  if isinstance(content, list):
    parts = []
    for chunk in content:
      chunk_text = getattr(chunk, "text", None)
      if chunk_text:
        parts.append(str(chunk_text).strip())
    text = " ".join(part for part in parts if part)
    return text or None

  return None


def _poll_transcript_job(client: Supadata, job_id: str) -> str | None:
  deadline = time.monotonic() + MAX_WAIT_SECONDS
  while time.monotonic() < deadline:
    try:
      response: dict[str, Any] = client._request("GET", f"/transcript/{job_id}")
    except Exception as exc:
      if _is_rate_limited(exc):
        time.sleep(RATE_LIMIT_BACKOFF_SECONDS)
        continue
      return None

    status = response.get("status")
    if status == "completed":
      result = response.get("result")
      if isinstance(result, dict):
        return _transcript_to_text(Transcript(**result))
      if "content" in response:
        return _transcript_to_text(Transcript(**response))
      return None
    if status == "failed":
      return None

    time.sleep(POLL_INTERVAL_SECONDS)

  return None


def fetch_transcript(media_url: str) -> str | None:
  """Return plain-text transcript for a reel/video URL, or None on failure."""
  client = get_client()
  deadline = time.monotonic() + MAX_WAIT_SECONDS

  while time.monotonic() < deadline:
    try:
      result = client.transcript(url=media_url, text=True)
    except Exception as exc:
      if _is_rate_limited(exc):
        time.sleep(RATE_LIMIT_BACKOFF_SECONDS)
        continue
      return None

    if isinstance(result, BatchJob):
      return _poll_transcript_job(client, result.job_id)

    return _transcript_to_text(result)

  return None
