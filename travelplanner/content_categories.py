"""Post-level content topic vocab.

Orthogonal to Place.category (attraction types). Exactly one primary topic
per post. Unknown or empty values are treated as unset.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from travelplanner.models import SavedPost

CONTENT_CATEGORIES: tuple[str, ...] = (
  "travel",
  "movies",
  "fashion",
  "hairstyle",
  "food",
  "other",
)

CONTENT_CATEGORY_SET: frozenset[str] = frozenset(CONTENT_CATEGORIES)

# Display order for library tabs. `other` stays last when present.
CONTENT_CATEGORY_TAB_ORDER: tuple[str, ...] = CONTENT_CATEGORIES

CLOSE_PIPELINE_PLACE = "place"
CLOSE_PIPELINE_MOVIE = "movie"

# Categories with no close pipeline yet — save the post, skip place/movie work.
_SKIP_CLOSE_CATEGORIES: frozenset[str] = frozenset(
  {"fashion", "hairstyle", "food", "other"}
)


def normalize_content_category(value: str | None) -> str | None:
  """Return a known content category, or None if missing/unknown."""
  if value is None:
    return None
  key = value.strip().lower()
  if not key or key not in CONTENT_CATEGORY_SET:
    return None
  return key


def inferred_content_category(post: SavedPost) -> str:
  """Stored category, else travel when the post has places, else other."""
  stored = normalize_content_category(post.content_category)
  if stored is not None:
    return stored
  if post.place_ids:
    return "travel"
  return "other"


def close_pipeline_for_category(category: str | None) -> str | None:
  """Which close pipeline to run after classify.

  ``place`` — extract/locate/upsert places (travel, or unset when classify skipped).
  ``movie`` — extract films and TV series from the content bundle.
  ``None`` — skip close (fashion / hairstyle / food / other until they have pipelines).
  """
  normalized = normalize_content_category(category)
  if normalized == "movies":
    return CLOSE_PIPELINE_MOVIE
  if normalized in _SKIP_CLOSE_CATEGORIES:
    return None
  return CLOSE_PIPELINE_PLACE
