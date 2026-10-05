from __future__ import annotations

import logging
import time
from typing import Any

from openai import OpenAI

from travelplanner import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None
_MAX_RETRIES = 2
_RETRY_BACKOFF_SECONDS = 1.5


def get_client() -> OpenAI | None:
  global _client
  api_key = settings.openai_api_key()
  if not api_key:
    return None
  if _client is None:
    _client = OpenAI(api_key=api_key)
  return _client


def create_json_completion(
  client: Any,
  *,
  system_prompt: str,
  user_content: str,
  schema_name: str,
  schema: dict[str, Any],
  log_label: str,
) -> Any | None:
  """Call OpenAI with a strict JSON schema. None once retries are exhausted.

  A reasoning model that rejects ``temperature`` is retried once without it.
  """
  request: dict[str, Any] = {
    "model": settings.openai_model(),
    "messages": [
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": user_content},
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": schema_name,
        "strict": True,
        "schema": schema,
      },
    },
    "temperature": settings.openai_temperature(),
  }

  attempt = 0
  while True:
    try:
      return client.chat.completions.create(**request)
    except Exception as exc:
      if "temperature" in request and "temperature" in str(exc).lower():
        request.pop("temperature")
        continue
      attempt += 1
      if attempt > _MAX_RETRIES:
        logger.exception("%s openai call failed after %d attempts", log_label, attempt)
        return None
      logger.warning(
        "%s openai call failed (attempt %d/%d), retrying: %s",
        log_label,
        attempt,
        _MAX_RETRIES,
        exc,
      )
      time.sleep(_RETRY_BACKOFF_SECONDS * attempt)
