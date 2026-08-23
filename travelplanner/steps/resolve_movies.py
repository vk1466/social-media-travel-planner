from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.movie_resolve import resolve_extracted_movies

logger = logging.getLogger(__name__)


def resolve_movies(ctx: IngestContext) -> IngestContext:
  """Match extracted titles on TMDB and fill OMDb ratings onto the post."""
  if ctx.post is None:
    logger.warning("resolve_movies skipped: no post on context")
    return ctx
  movies = resolve_extracted_movies(ctx.post.extracted_movies)
  ctx.post = replace(ctx.post, resolved_movies=movies)
  logger.info(
    "resolve_movies done post_id=%s resolved=%d extracted=%d",
    ctx.post.post_id,
    len(movies),
    len(ctx.post.extracted_movies),
  )
  return ctx


RESOLVE_MOVIES_STEP = Step(
  name="resolve_movies",
  run=resolve_movies,
  retry_attempts=2,
  retry_backoff_seconds=1.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
