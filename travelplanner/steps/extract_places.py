from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.extract import (
  Snippet,
  content_bundle_from_post,
  fetch_places_from_snippets,
  generate_clean_title,
  snippets_from_bundle,
)
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.reel_frame_text import parse_expected_list_count

logger = logging.getLogger(__name__)


def extract_places(ctx: IngestContext) -> IngestContext:
  """Run generic place extraction over content snippets on the context."""
  if ctx.place_extraction_done:
    logger.info("extract_places skipped: post already read")
    return ctx
  bundle = ctx.content_bundle
  if bundle is None:
    if ctx.post is None:
      logger.warning("extract_places skipped: no content_bundle or post on context")
      return ctx
    effective_transcript = (
      None if getattr(ctx, "transcript_is_music", False) else ctx.transcript
    )
    bundle = content_bundle_from_post(
      ctx.post,
      transcript=effective_transcript,
      image_text=ctx.image_text,
      video_analysis=ctx.video_analysis,
    )
  ctx.content_bundle = bundle
  snippets = snippets_from_bundle(bundle)
  extracted = fetch_places_from_snippets(snippets)

  # Check for expected place count (e.g. 'top 10', '7 best cafes')
  expected_count: int | None = None
  if ctx.post and ctx.post.caption:
    expected_count = parse_expected_list_count(ctx.post.caption)
  if not expected_count and ctx.image_text:
    expected_count = parse_expected_list_count(ctx.image_text)
  if not expected_count and extracted.reel_summary:
    expected_count = parse_expected_list_count(extracted.reel_summary)

  if expected_count and len(extracted.places) < expected_count:
    logger.info(
      "extract_places re-running: expected %d places, found %d",
      expected_count,
      len(extracted.places),
    )
    retry_snippet = Snippet(
      source="expected_count_hint",
      text=(
        f"The content promises {expected_count} places/items (e.g. 'Top {expected_count}' or '{expected_count} spots'). "
        f"Only {len(extracted.places)} were detected. Please re-examine all captions, frame OCR, and transcripts "
        f"to extract all {expected_count} places mentioned."
      ),
    )
    retry_extracted = fetch_places_from_snippets([*snippets, retry_snippet])
    if len(retry_extracted.places) > len(extracted.places):
      extracted = retry_extracted

  ctx.expected_place_count = expected_count

  if ctx.post is not None:
    post_title = extracted.title or ctx.post.title
    if not post_title:
      post_title = generate_clean_title(
        ctx.post.caption,
        summary=extracted.reel_summary,
        places=extracted.places,
      )
    ctx.post = replace(
      ctx.post,
      extracted_places=extracted.places,
      reel_summary=extracted.reel_summary,
      trip_tips=extracted.trip_tips,
      title=post_title,
      expected_place_count=expected_count,
    )
  ctx.place_extraction_done = True
  logger.info(
    "extract_places done places=%d expected=%s has_summary=%s sources=%s",
    len(extracted.places),
    expected_count,
    bool(extracted.reel_summary),
    [snippet.source for snippet in snippets],
  )
  return ctx


EXTRACT_PLACES_STEP = Step(
  name="extract_places",
  run=extract_places,
  retry_attempts=2,
  retry_backoff_seconds=1.5,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
