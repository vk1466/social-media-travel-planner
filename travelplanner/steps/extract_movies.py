from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.extract import content_bundle_from_post, snippets_from_bundle
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.movie_extract import fetch_movies_from_snippets

logger = logging.getLogger(__name__)


def extract_movies(ctx: IngestContext) -> IngestContext:
  """Run generic film and TV extraction over content snippets on the context."""
  bundle = ctx.content_bundle
  if bundle is None:
    if ctx.post is None:
      logger.warning("extract_movies skipped: no content_bundle or post on context")
      return ctx
    bundle = content_bundle_from_post(
      ctx.post,
      transcript=ctx.transcript,
      image_text=ctx.image_text,
      video_analysis=ctx.video_analysis,
    )
    ctx.content_bundle = bundle

  movies = fetch_movies_from_snippets(snippets_from_bundle(bundle))
  if ctx.post is not None:
    ctx.post = replace(ctx.post, extracted_movies=movies)
  logger.info("extract_movies done movies=%d", len(movies))
  return ctx


EXTRACT_MOVIES_STEP = Step(
  name="extract_movies",
  run=extract_movies,
  retry_attempts=2,
  retry_backoff_seconds=1.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
