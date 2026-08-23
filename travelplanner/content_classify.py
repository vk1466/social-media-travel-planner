"""LLM classifier for SavedPost.content_category.

Fail-soft: missing key, empty snippets, or OpenAI errors return None so ingest
still saves the post and place close still runs.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Sequence

from travelplanner.content_categories import (
  CONTENT_CATEGORIES,
  normalize_content_category,
)
from travelplanner.extract import ContentSnippet, format_content_snippets

logger = logging.getLogger(__name__)

_OPENAI_MAX_RETRIES = 2
_OPENAI_RETRY_BACKOFF_SECONDS = 1.5

CLASSIFY_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "content_category": {
      "type": "string",
      "enum": list(CONTENT_CATEGORIES),
      "description": (
        "Primary topic of this post. travel = destinations, itineraries, "
        "hotels, restaurants as a trip. movies = films and TV series, "
        "trailers, recaps, reviews. fashion = outfits, clothing, styling "
        "looks. hairstyle = haircuts, color, hair tutorials. food = home "
        "cooking or recipes, not a trip. other = anything else or mixed/unclear."
      ),
    }
  },
  "required": ["content_category"],
  "additionalProperties": False,
}

CLASSIFY_PROMPT = (
  "Classify this social media post into exactly one primary content_category.\n\n"
  "Categories:\n"
  "- travel: destinations, itineraries, hotels, restaurants as part of a trip, "
  "outdoor places to visit.\n"
  "- movies: films and TV series (trailers, recaps, reviews, scenes, "
  "what-to-watch). Includes streaming shows, seasons, and episodes.\n"
  "- fashion: outfits, clothing, styling, lookbooks, what-to-wear.\n"
  "- hairstyle: haircuts, color, hair care, hair tutorials.\n"
  "- food: home cooking, recipes, kitchen technique. A restaurant reel that is "
  "about going there on a trip is travel, not food.\n"
  "- other: mixed, unclear, or none of the above.\n\n"
  "Pick the dominant topic from the sources. Do not invent facts. If sources "
  "are thin or mixed, use other."
)


def _create_completion(client: Any, content: str) -> Any | None:
  from travelplanner import settings

  request: dict[str, Any] = {
    "model": settings.openai_model(),
    "messages": [
      {"role": "system", "content": CLASSIFY_PROMPT},
      {"role": "user", "content": content},
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "content_category",
        "strict": True,
        "schema": CLASSIFY_SCHEMA,
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
      if attempt > _OPENAI_MAX_RETRIES:
        logger.exception("classify openai call failed after %d attempts", attempt)
        return None
      logger.warning(
        "classify openai call failed (attempt %d/%d), retrying: %s",
        attempt,
        _OPENAI_MAX_RETRIES,
        exc,
      )
      time.sleep(_OPENAI_RETRY_BACKOFF_SECONDS * attempt)


def classify_from_snippets(snippets: Sequence[ContentSnippet]) -> str | None:
  """Return a normalized content category, or None when classification is skipped."""
  content = format_content_snippets(snippets).strip()
  if not content:
    logger.info("classify skipped: empty content snippets")
    return None

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  client = get_client()
  if client is None:
    logger.warning("classify skipped: OPENAI_API_KEY not set")
    return None

  logger.info(
    "classify start model=%s content_chars=%d",
    settings.openai_model(),
    len(content),
  )
  response = _create_completion(client, content)
  if response is None:
    return None

  message_content = response.choices[0].message.content
  if not message_content:
    logger.warning("classify empty openai response")
    return None

  try:
    data = json.loads(message_content)
  except (json.JSONDecodeError, TypeError):
    logger.exception("classify invalid json from openai")
    return None

  if not isinstance(data, dict):
    return None
  category = normalize_content_category(data.get("content_category"))
  logger.info("classify done category=%s", category)
  return category
