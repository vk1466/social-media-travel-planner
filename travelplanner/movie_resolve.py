"""Resolve extracted film titles against TMDB, then fill OMDb ratings."""

from __future__ import annotations

import logging
import re
from typing import Any, Sequence

from travelplanner.clients import omdb, tmdb
from travelplanner.movie_hints import (
  TITLE_KIND_TV,
  ExtractedMovie,
  ResolvedMovie,
  normalize_title_kind,
)

logger = logging.getLogger(__name__)

_RT_PERCENT = re.compile(r"(\d+)\s*%")
_MAX_REVIEW_DOCS = 5
_MAX_REVIEW_CHARS = 1200


def _optional_int(value: Any) -> int | None:
  if isinstance(value, bool) or value is None:
    return None
  if isinstance(value, int):
    return value
  if isinstance(value, float) and value.is_integer():
    return int(value)
  if isinstance(value, str) and value.strip().isdigit():
    return int(value.strip())
  return None


def _optional_float(value: Any) -> float | None:
  if isinstance(value, bool) or value is None:
    return None
  if isinstance(value, (int, float)):
    return float(value)
  if isinstance(value, str):
    try:
      return float(value.strip())
    except ValueError:
      return None
  return None


def _year_from_release_date(value: Any) -> int | None:
  if not isinstance(value, str) or len(value) < 4 or not value[:4].isdigit():
    return None
  return int(value[:4])


def _us_certification(details: dict[str, Any]) -> str | None:
  results = (details.get("release_dates") or {}).get("results") or []
  for country in results:
    if not isinstance(country, dict) or country.get("iso_3166_1") != "US":
      continue
    for release in country.get("release_dates") or []:
      if not isinstance(release, dict):
        continue
      cert = str(release.get("certification") or "").strip()
      if cert:
        return cert
  return None


def _us_tv_rating(details: dict[str, Any]) -> str | None:
  results = (details.get("content_ratings") or {}).get("results") or []
  for country in results:
    if not isinstance(country, dict) or country.get("iso_3166_1") != "US":
      continue
    rating = str(country.get("rating") or "").strip()
    if rating:
      return rating
  return None


def _tv_episode_runtime(details: dict[str, Any]) -> int | None:
  runtimes = details.get("episode_run_time") or []
  if not isinstance(runtimes, list):
    return None
  for value in runtimes:
    minutes = _optional_int(value)
    if minutes is not None and minutes > 0:
      return minutes
  return None


def rotten_tomatoes_percent(ratings: Any) -> int | None:
  if not isinstance(ratings, list):
    return None
  for item in ratings:
    if not isinstance(item, dict):
      continue
    if str(item.get("Source") or "") != "Rotten Tomatoes":
      continue
    match = _RT_PERCENT.search(str(item.get("Value") or ""))
    if match:
      return int(match.group(1))
  return None


def _review_texts(details: dict[str, Any]) -> tuple[str, ...]:
  results = (details.get("reviews") or {}).get("results") or []
  texts: list[str] = []
  for item in results:
    if not isinstance(item, dict):
      continue
    content = str(item.get("content") or "").strip()
    if not content:
      continue
    texts.append(content[:_MAX_REVIEW_CHARS])
    if len(texts) >= _MAX_REVIEW_DOCS:
      break
  return tuple(texts)


def _summarize_reviews(texts: Sequence[str]) -> str | None:
  if not texts:
    return None
  from travelplanner.clients.openai import get_client
  from travelplanner import settings

  client = get_client()
  if client is None:
    return None
  numbered = "\n\n".join(f"Review {index + 1}:\n{text}" for index, text in enumerate(texts))
  request: dict[str, Any] = {
    "model": settings.openai_model(),
    "messages": [
      {
        "role": "system",
        "content": (
          "Summarize these reviews in 2-3 neutral sentences. "
          "Use only the provided reviews. Do not invent ratings or plot."
        ),
      },
      {"role": "user", "content": numbered},
    ],
    "temperature": settings.openai_temperature(),
  }
  try:
    try:
      response = client.chat.completions.create(**request)
    except Exception as exc:
      if "temperature" in request and "temperature" in str(exc).lower():
        request.pop("temperature")
        response = client.chat.completions.create(**request)
      else:
        raise
  except Exception:
    logger.exception("movie review summary openai failed")
    return None
  content = response.choices[0].message.content
  if not content:
    return None
  summary = content.strip()
  return summary or None


def _from_catalog(
  *,
  extracted: ExtractedMovie,
  hit: dict[str, Any],
  details: dict[str, Any],
  omdb_payload: dict[str, Any] | None,
) -> ResolvedMovie:
  kind = normalize_title_kind(extracted.kind)
  tmdb_id = int(hit["id"])
  title = str(
    details.get("title")
    or details.get("name")
    or hit.get("title")
    or hit.get("name")
    or extracted.title
  ).strip()
  year = _year_from_release_date(
    details.get("release_date")
    or details.get("first_air_date")
    or hit.get("release_date")
    or hit.get("first_air_date")
  )
  if year is None:
    year = extracted.year
  genres = tuple(
    str(genre.get("name")).strip()
    for genre in details.get("genres") or []
    if isinstance(genre, dict) and str(genre.get("name") or "").strip()
  )
  plot = str(details.get("overview") or "").strip() or None
  if kind == TITLE_KIND_TV:
    classification = _us_tv_rating(details)
    runtime_minutes = _tv_episode_runtime(details)
    number_of_seasons = _optional_int(details.get("number_of_seasons"))
  else:
    classification = _us_certification(details)
    runtime_minutes = _optional_int(details.get("runtime"))
    number_of_seasons = None
  imdb_id = (details.get("external_ids") or {}).get("imdb_id")
  if isinstance(imdb_id, str):
    imdb_id = imdb_id.strip() or None
  else:
    imdb_id = None

  imdb_rating = None
  rt_percent = None
  if omdb_payload is not None:
    imdb_rating = _optional_float(omdb_payload.get("imdbRating"))
    rt_percent = rotten_tomatoes_percent(omdb_payload.get("Ratings"))
    if classification is None:
      rated = str(omdb_payload.get("Rated") or "").strip()
      if rated and rated.upper() not in {"N/A", "UNRATED", "NOT RATED"}:
        classification = rated
    if plot is None:
      omdb_plot = str(omdb_payload.get("Plot") or "").strip()
      plot = omdb_plot or None
    if runtime_minutes is None:
      runtime_minutes = _optional_int(
        str(omdb_payload.get("Runtime") or "").split(" ")[0]
      )

  review_summary = _summarize_reviews(_review_texts(details))
  return ResolvedMovie(
    tmdb_id=tmdb_id,
    title=title,
    imdb_id=imdb_id,
    year=year,
    runtime_minutes=runtime_minutes,
    original_language=str(details.get("original_language") or "").strip() or None,
    genres=genres,
    classification=classification,
    plot_summary=plot,
    imdb_rating=imdb_rating,
    rotten_tomatoes_percent=rt_percent,
    review_summary=review_summary,
    kind=kind,
    number_of_seasons=number_of_seasons,
  )


def _tmdb_lookup(
  extracted: ExtractedMovie,
) -> tuple[dict[str, Any], dict[str, Any]] | None:
  kind = normalize_title_kind(extracted.kind)
  if kind == TITLE_KIND_TV:
    hit = tmdb.search_tv(extracted.title, extracted.year)
  else:
    hit = tmdb.search_movie(extracted.title, extracted.year)
  if hit is None or hit.get("id") is None:
    return None
  try:
    tmdb_id = int(hit["id"])
  except (TypeError, ValueError):
    return None
  details = tmdb.tv_details(tmdb_id) if kind == TITLE_KIND_TV else tmdb.movie_details(tmdb_id)
  if details is None:
    return None
  return hit, details


def resolve_extracted_movies(
  movies: Sequence[ExtractedMovie],
) -> tuple[ResolvedMovie, ...]:
  """Match each extracted title on TMDB and attach OMDb scores. Fail-soft."""
  if tmdb.api_key() is None:
    logger.info("resolve_movies skipped: TMDB_API_KEY not set")
    return ()

  resolved: list[ResolvedMovie] = []
  seen: set[tuple[str, int]] = set()
  for extracted in movies:
    kind = normalize_title_kind(extracted.kind)
    lookup = _tmdb_lookup(extracted)
    if lookup is None:
      logger.info(
        "tmdb search miss title=%r year=%s kind=%s",
        extracted.title,
        extracted.year,
        kind,
      )
      continue
    hit, details = lookup
    try:
      tmdb_id = int(hit["id"])
    except (TypeError, ValueError):
      continue
    seen_key = (kind, tmdb_id)
    if seen_key in seen:
      continue
    imdb_id = (details.get("external_ids") or {}).get("imdb_id")
    omdb_payload = omdb.by_imdb_id(imdb_id) if isinstance(imdb_id, str) and imdb_id.strip() else None
    resolved.append(
      _from_catalog(
        extracted=extracted,
        hit=hit,
        details=details,
        omdb_payload=omdb_payload,
      )
    )
    seen.add(seen_key)
    logger.info(
      "resolve_movies title=%r kind=%s tmdb_id=%s imdb=%s rt=%s",
      extracted.title,
      kind,
      tmdb_id,
      imdb_id,
      resolved[-1].rotten_tomatoes_percent,
    )
  return tuple(resolved)
