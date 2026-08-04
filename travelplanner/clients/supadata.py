from __future__ import annotations

import logging
import time
from typing import Any

from supadata import Supadata
from supadata.errors import SupadataError
from supadata.types import BatchJob, Transcript

from travelplanner import settings

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2
RATE_LIMIT_BACKOFF_SECONDS = 5
MAX_WAIT_SECONDS = 180

_VIDEO_ANALYSIS_PROMPT = (
  "This is a travel social video. Identify specific real-world places shown or "
  "named in the VIDEO itself (overlays, landmarks, maps, spoken names). Prefer "
  "pin-able names (trail, viewpoint, island, village) over countries. Do not "
  "invent places not supported by the video."
)

_VIDEO_ANALYSIS_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "scene_summary": {
      "type": "string",
      "description": "What the viewer sees in the video",
    },
    "on_screen_text": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Readable text overlays or titles shown in the video",
    },
    "places": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "place_name": {"type": "string"},
          "kind": {
            "type": "string",
            "description": "e.g. hike, viewpoint, island, ferry, village",
          },
          "evidence": {
            "type": "string",
            "description": "What in the video supports this place",
          },
        },
        "required": ["place_name", "evidence"],
      },
    },
  },
  "required": ["scene_summary", "places"],
}


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


def _flatten_video_analysis(data: dict[str, Any]) -> str | None:
  lines: list[str] = []
  scene = (data.get("scene_summary") or "").strip()
  if scene:
    lines.append(f"Scene: {scene}")
  for text in data.get("on_screen_text") or []:
    cleaned = str(text).strip()
    if cleaned:
      lines.append(f"On-screen text: {cleaned}")
  for place in data.get("places") or []:
    if not isinstance(place, dict):
      continue
    place_name = str(place.get("place_name") or "").strip()
    if not place_name:
      continue
    kind = str(place.get("kind") or "").strip() or "unknown"
    evidence = str(place.get("evidence") or "").strip()
    if evidence:
      lines.append(f"Place: {place_name} ({kind}) — {evidence}")
    else:
      lines.append(f"Place: {place_name} ({kind})")
  return "\n".join(lines) if lines else None


def _poll_extract_job(client: Supadata, job_id: str) -> dict[str, Any] | None:
  deadline = time.monotonic() + MAX_WAIT_SECONDS
  while time.monotonic() < deadline:
    try:
      result = client.extract.get_results(job_id)
      if hasattr(result, "status"):
        status = result.status
        if status == "completed":
          data = getattr(result, "data", None)
          return data if isinstance(data, dict) else None
        if status == "failed":
          return None
      elif isinstance(result, dict):
        status = result.get("status")
        if status == "completed":
          data = result.get("data")
          return data if isinstance(data, dict) else None
        if status == "failed":
          return None
    except Exception as exc:
      if _is_rate_limited(exc):
        time.sleep(RATE_LIMIT_BACKOFF_SECONDS)
        continue
      try:
        response = client._request("GET", f"/extract/{job_id}")
      except Exception:
        return None
      status = response.get("status")
      if status == "completed":
        data = response.get("data")
        return data if isinstance(data, dict) else None
      if status == "failed":
        return None

    time.sleep(POLL_INTERVAL_SECONDS)

  return None


def fetch_video_analysis(media_url: str) -> str | None:
  """Run Supadata multimodal extract; return flattened text or None."""
  client = get_client()
  try:
    job = client.extract(
      url=media_url,
      prompt=_VIDEO_ANALYSIS_PROMPT,
      schema=_VIDEO_ANALYSIS_SCHEMA,
    )
  except Exception:
    logger.exception("supadata extract start failed url=%s", media_url)
    return None

  job_id = getattr(job, "job_id", None)
  if not job_id:
    return None

  data = _poll_extract_job(client, job_id)
  if not data:
    logger.warning("supadata extract empty/failed job_id=%s", job_id)
    return None
  return _flatten_video_analysis(data)
