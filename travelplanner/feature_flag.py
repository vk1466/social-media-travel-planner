"""Product feature toggles.

Flags live in an in-process dict. Call sites use ``get`` / ``set``:

  from travelplanner.feature_flag import FeatureFlag

  if FeatureFlag.get("place_facts"):
    ...

  FeatureFlag.set("place_facts", True)
"""

from __future__ import annotations

from typing import Any


class FeatureFlag:
  """In-process feature values. Missing names default to False for booleans."""

  _flags: dict[str, Any] = {
    "place_facts": False,
    # OCR for image posts and carousels (slide URLs from Mindcase).
    "extract_image_text": True,
    # Supadata multimodal extract for reel/video (scene, overlays, places).
    "extract_video_analysis": True,
    # Reel/video frame OCR (OpenAI vision). Off by default — use analyze_video for travel;
    # recipe close uses extract_recipe_frames when food_recipes is on.
    "extract_reel_frame_text": False,
    # When Nominatim locate fails, try one cheap Google Geocoding/Places call.
    "google_geocode_fallback": False,
    # Classify SavedPost.content_category, then dispatch place vs movie close.
    "content_categories": True,
    # Extract source-grounded, possibly incomplete recipes from food reels.
    "food_recipes": True,
    # Estimate recipe macros from weighed ingredients using USDA FoodData Central.
    "recipe_nutrition": True,
    "place_facts_ttl_days": 30,
    "place_facts_max_docs": 6,
  }

  @classmethod
  def get(cls, name: str, default: Any = False) -> Any:
    """Return the value for ``name``, or ``default`` when unset."""
    return cls._flags.get(name, default)

  @classmethod
  def set(cls, name: str, value: Any) -> None:
    """Add or update ``name`` in the flag dict."""
    cls._flags[name] = value
