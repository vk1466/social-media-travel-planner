from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.content_category_jev import category_from_text
from travelplanner.extract import (
  content_bundle_from_post,
  format_content_snippets,
  snippets_from_bundle,
)
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)


import re


def detect_secondary_categories(text: str, primary: str) -> list[str]:
  secondaries: list[str] = []
  lower = text.lower()
  if primary != "food" and re.search(r"\b(recipe|ingredients?|tbsp|tsp|cup of|bake for|cook for|simmer)\b", lower):
    secondaries.append("food")
  if primary != "movies" and re.search(r"\b(movie|film|films|directed by|streaming on|netflix|hbo|imdb|watch this)\b", lower):
    secondaries.append("movies")
  if primary != "fashion" and re.search(r"\b(outfit|wearing|ootd|styling|wardrobe|dress from|jacket from)\b", lower):
    secondaries.append("fashion")
  if primary != "hairstyle" and re.search(r"\b(haircut|hairstyle|fade haircut|curtain bangs|hair tutorial)\b", lower):
    secondaries.append("hairstyle")
  if primary != "travel" and re.search(r"\b(must[- ]visit|places to visit|things to do in|itinerary|hidden gem|hotel)\b", lower):
    secondaries.append("travel")
  return secondaries


def classify_content(ctx: IngestContext) -> IngestContext:
  """Stamp content_category and secondary_categories from a Jev choice.

  A weak choice is stored as other. The flag-off path leaves the category unset.
  """
  if not FeatureFlag.get("content_categories"):
    logger.info("classify_content skipped: feature disabled")
    return ctx
  if ctx.post is None:
    logger.warning("classify_content skipped: no post on context")
    return ctx

  effective_transcript = (
    None if getattr(ctx, "transcript_is_music", False) else ctx.transcript
  )
  bundle = content_bundle_from_post(
    ctx.post,
    transcript=effective_transcript,
    image_text=ctx.image_text,
  )
  text = format_content_snippets(snippets_from_bundle(bundle))
  category = category_from_text(text) or "other"
  secondaries = detect_secondary_categories(text, category)
  ctx.post = replace(
    ctx.post,
    content_category=category,
    secondary_categories=tuple(secondaries),
  )
  logger.info(
    "classify_content post_id=%s category=%s secondaries=%s",
    ctx.post.post_id,
    category,
    secondaries,
  )
  return ctx


CLASSIFY_CONTENT_STEP = Step(
  name="classify_content",
  run=classify_content,
)
