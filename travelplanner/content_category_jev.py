"""Jev choice for a post's content category.

A weak answer returns None. The classify step stores that as other.
A Jev failure raises CategoryCheckError and the pipeline stops.
"""

from __future__ import annotations

import logging

from travelplanner.clients.jev import system_one
from travelplanner.content_categories import normalize_content_category

logger = logging.getLogger(__name__)


class CategoryCheckError(RuntimeError):
  """Jev could not classify the post."""

# Below this, the choice is not trusted and the post stays unset.
CATEGORY_CONFIDENCE_MIN = 0.6

CATEGORY_INSTRUCTIONS = (
  "Primary topic of this post. A named restaurant, cafe, bar, or market "
  "you can visit is travel, not food: use travel, not food. A broad city, "
  "state, or country tag does not make a recipe travel. Films and TV series "
  "are movies. Recipes and home cooking with no visitable venue are food."
)

_CATEGORY_QUESTION = {
  "content_category": {
    "type": "choice",
    "instructions": CATEGORY_INSTRUCTIONS,
    "criteria": {
      "travel": "Destinations, itineraries, hotels, and visitable venues.",
      "movies": "Films and TV series: trailers, recaps, reviews, what to watch.",
      "fashion": "Outfits, clothing, styling, what to wear.",
      "hairstyle": "Haircuts, color, hair tutorials.",
      "food": "Recipes and home cooking with no visitable venue.",
      "other": "Mixed, unclear, or none of the above.",
    },
  }
}


def category_from_text(text: str) -> str | None:
  """Return a content category, or None when the choice is too weak.

  Raises CategoryCheckError when Jev itself fails.
  """
  if not text.strip():
    return None
  try:
    payload = system_one(state=text, questions=_CATEGORY_QUESTION)
  except Exception as exc:
    logger.error("content category check failed error=%s", exc)
    raise CategoryCheckError(str(exc)) from exc

  answer = (payload.get("answers") or {}).get("content_category") or {}
  category = normalize_content_category(answer.get("choice") if isinstance(answer.get("choice"), str) else None)
  try:
    confidence = float(answer.get("confidence"))
  except (TypeError, ValueError):
    confidence = 0.0
  if category is None or confidence < CATEGORY_CONFIDENCE_MIN:
    logger.info(
      "content category unset choice=%s confidence=%.2f",
      answer.get("choice"),
      confidence,
    )
    return None
  logger.info("content category %s confidence=%.2f", category, confidence)
  return category
