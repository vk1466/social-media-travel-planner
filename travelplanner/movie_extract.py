"""LLM extractor for film and TV titles on a movie-classified post.

Fail-soft: missing key, empty snippets, or OpenAI errors return an empty
tuple so ingest still saves the post.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Sequence

from travelplanner.extract import ContentSnippet, format_content_snippets
from travelplanner.movie_hints import ExtractedMovie, normalize_title_kind

logger = logging.getLogger(__name__)

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
  "Extract the films and TV series this social media post is about. This post has "
  "been classified as movie/TV entertainment content.\n\n"
  "Rules:\n"
  "- Identify film or series titles that are the subject of the post (trailers, "
  "clips, scene highlights, reviews, recaps, what-to-watch, or official show accounts).\n"
  "- Look for titles across all provided sources: caption, account handle, "
  "on-screen text overlays, scene descriptions, dialogue/transcripts, or viewer comments.\n"
  "- kind=movie for a film. kind=tv for a TV or streaming series, limited "
  "series, season, or episode.\n"
  "- Use the clean canonical title (e.g. 'Sacred Games', not 'Sacred Games Season 2' "
  "or 'Sacred Games Trailer'). Do not append year, season, episode, or 'trailer' to the title.\n"
  "- Set year only when the sources name it (film release or series first air). Otherwise null.\n"
  "- details is one concise sentence of context from the sources (e.g. clip highlight, "
  "premise, or viewer discussion). Null if there is no extra context.\n"
  "- Do not invent titles that have no basis in the sources. Only return an empty "
  "list if no movie or TV title can be determined.\n"
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
  from travelplanner.clients.openai import create_json_completion

  return create_json_completion(
    client,
    system_prompt=MOVIE_EXTRACT_PROMPT,
    user_content=content,
    schema_name="extracted_movies",
    schema=MOVIE_EXTRACT_SCHEMA,
    log_label="movie extract",
  )


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
