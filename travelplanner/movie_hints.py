"""Internal movie-pipeline shapes — not domain entities.

`ExtractedMovie` is a reel mention (film or TV series). `ResolvedMovie` is the
TMDB/OMDb catalog snapshot stamped on the post. A shared Movie table is not
wired yet.
"""

from __future__ import annotations

from dataclasses import dataclass

TITLE_KIND_MOVIE = "movie"
TITLE_KIND_TV = "tv"
TITLE_KINDS = frozenset({TITLE_KIND_MOVIE, TITLE_KIND_TV})


def normalize_title_kind(value: str | None) -> str:
  """Return ``movie`` or ``tv``. Unknown values default to movie."""
  if value is None:
    return TITLE_KIND_MOVIE
  key = value.strip().casefold()
  if key in {"tv", "series", "show", "television"}:
    return TITLE_KIND_TV
  return TITLE_KIND_MOVIE


@dataclass(frozen=True)
class ExtractedMovie:
  """Film or TV series mentioned as the subject of a post."""

  title: str
  year: int | None = None
  details: str | None = None
  kind: str = TITLE_KIND_MOVIE


@dataclass(frozen=True)
class ResolvedMovie:
  """Catalog title matched from an extracted film or series."""

  tmdb_id: int
  title: str
  imdb_id: str | None = None
  year: int | None = None
  runtime_minutes: int | None = None
  original_language: str | None = None
  genres: tuple[str, ...] = ()
  classification: str | None = None
  plot_summary: str | None = None
  imdb_rating: float | None = None
  rotten_tomatoes_percent: int | None = None
  review_summary: str | None = None
  kind: str = TITLE_KIND_MOVIE
  number_of_seasons: int | None = None
