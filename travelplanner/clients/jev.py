"""TypeSafe Jev SystemOne client (choice / score / noul)."""

from __future__ import annotations

import json
import logging
import ssl
import time
import urllib.error
import urllib.request
from typing import Any

import certifi

from travelplanner import settings

logger = logging.getLogger(__name__)

_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def system_one(*, state: str, questions: dict[str, dict[str, Any]]) -> dict[str, Any]:
  """One Jev decision. Returns the parsed response body."""
  key = settings.jev_api_key()
  if not key:
    raise RuntimeError("JEV_API_KEY is not set")
  body = json.dumps(
    {"model": settings.jev_model(), "state": state, "questions": questions}
  ).encode("utf-8")
  last_error: Exception | None = None
  for attempt in range(3):
    request = urllib.request.Request(
      settings.jev_base_url(),
      data=body,
      headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      method="POST",
    )
    try:
      with urllib.request.urlopen(request, timeout=20, context=_SSL_CONTEXT) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
      if not isinstance(payload, dict) or not isinstance(payload.get("answers"), dict):
        raise RuntimeError("Jev returned no answers")
      return payload
    except urllib.error.HTTPError as exc:
      detail = exc.read().decode("utf-8", errors="replace")[:240]
      last_error = RuntimeError(f"Jev {exc.code}: {detail}")
      if exc.code not in {429, 500, 502, 503, 504}:
        raise last_error from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
      last_error = RuntimeError(f"Jev request failed: {exc}")
    if attempt < 2:
      time.sleep(0.25 * (2**attempt))
  raise last_error or RuntimeError("Jev request failed")
