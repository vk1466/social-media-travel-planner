"""LLM extractor for film and TV titles on a movie-classified post.

Fail-soft: missing key, empty snippets, or OpenAI errors return an empty
tuple so ingest still saves the post.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Sequence

from travelplanner.extract import ContentSnippet, format_content_snippets
from travelplanner.movie_hints import ExtractedMovie, normalize_title_kind

logger = logging.getLogger(__name__)

_OPENAI_MAX_RETRIES = 2
_OPENAI_RETRY_BACKOFF_SECONDS = 1.5

MOVIE_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "movies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": (
              "Canonical film or series title only. No year, season, "
              "episode, or 'trailer' suffix."
            ),
          },
          "year": {
            "type": ["integer", "null"],
            "description": (
              "Release or first-air year when the sources name it. Null if unknown."
            ),
          },
          "details": {
            "type": ["string", "null"],
            "description": (
              "One short sentence from the sources (trailer, review, scene). "
              "Null if sources give no extra context. Never invent facts."
            ),
          },
          "kind": {
            "type": "string",
            "enum": ["movie", "tv"],
            "description": "movie = theatrical/streaming film. tv = TV or streaming series.",
          },
        },
        "required": ["title", "year", "details", "kind"],
        "additionalProperties": False,
      },
    }
  },
  "required": ["movies"],
  "additionalProperties": False,
}

MOVIE_EXTRACT_PROMPT = (
  "Extract the films and TV series this social media post is about.\n\n"
  "Rules:\n"
  "- Only titles that are the subject of the post (trailer, recap, review, "
  "scene clip, what-to-watch).\n"
  "- kind=movie for a film. kind=tv for a TV or streaming series, limited "
  "series, season, or episode of a show.\n"
  "- Use the canonical title. Do not append year, season, episode, or "
  "'trailer' to the title.\n"
  "- Set year only when the sources name it (film release or series first air). "
  "Otherwise null.\n"
  "- details is one sentence copied or lightly paraphrased from the sources. "
  "Null if there is no extra context.\n"
  "- Do not invent titles. If sources are thin or mixed, return an empty list.\n"
  "- Do not extract filming locations, theaters, or trip stops — those are places."
)


def _optional_str(value: Any) -> str | None:
  if not isinstance(value, str):
    return None
  text = value.strip()
  return text or None


def _optional_year(value: Any) -> int | None:
  if isinstance(value, bool) or value is None:
    return None
  if isinstance(value, int):
    year = value
  elif isinstance(value, float) and value.is_integer():
    year = int(value)
  else:
    return None
  if year < 1888 or year > 2100:
    return None
  return year


def _parse_extracted_movies(data: dict[str, Any] | None) -> tuple[ExtractedMovie, ...]:
  if not data:
    return ()
  raw = data.get("movies")
  if not isinstance(raw, list):
    return ()
  movies: list[ExtractedMovie] = []
  seen: set[tuple[str, int | None, str]] = set()
  for item in raw:
    if not isinstance(item, dict):
      continue
    title = _optional_str(item.get("title"))
    if title is None:
      continue
    year = _optional_year(item.get("year"))
    kind = normalize_title_kind(
      item.get("kind") if isinstance(item.get("kind"), str) else None
    )
    key = (title.casefold(), year, kind)
    if key in seen:
      continue
    seen.add(key)
    movies.append(
      ExtractedMovie(
        title=title,
        year=year,
        details=_optional_str(item.get("details")),
        kind=kind,
      )
    )
  return tuple(movies)


def _create_completion(client: Any, content: str) -> Any | None:
  from travelplanner import settings

  request: dict[str, Any] = {
    "model": settings.openai_model(),
    "messages": [
      {"role": "system", "content": MOVIE_EXTRACT_PROMPT},
      {"role": "user", "content": content},
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "extracted_movies",
        "strict": True,
        "schema": MOVIE_EXTRACT_SCHEMA,
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
        logger.exception("movie extract openai call failed after %d attempts", attempt)
        return None
      logger.warning(
        "movie extract openai call failed (attempt %d/%d), retrying: %s",
        attempt,
        _OPENAI_MAX_RETRIES,
        exc,
      )
      time.sleep(_OPENAI_RETRY_BACKOFF_SECONDS * attempt)


def fetch_movies_from_snippets(
  snippets: Sequence[ContentSnippet],
) -> tuple[ExtractedMovie, ...]:
  """Extract films and TV series from (source, text) snippets. Empty on skip or failure."""
  content = format_content_snippets(snippets).strip()
  if not content:
    logger.info("movie extract skipped: empty content snippets")
    return ()

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  client = get_client()
  if client is None:
    logger.warning("movie extract skipped: OPENAI_API_KEY not set")
    return ()

  logger.info(
    "movie extract start model=%s content_chars=%d",
    settings.openai_model(),
    len(content),
  )
  response = _create_completion(client, content)
  if response is None:
    return ()

  message_content = response.choices[0].message.content
  if not message_content:
    logger.warning("movie extract empty openai response")
    return ()

  try:
    data = json.loads(message_content)
  except (json.JSONDecodeError, TypeError):
    logger.exception("movie extract invalid json from openai")
    return ()

  movies = _parse_extracted_movies(data if isinstance(data, dict) else None)
  logger.info(
    "movie extract done movies=%d titles=%s",
    len(movies),
    [movie.title for movie in movies],
  )
  return movies
