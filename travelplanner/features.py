"""Product feature toggles.

Flip or add flags here by hand. Call sites use attributes or ``get``:

  from travelplanner.features import FeatureFlag

  if FeatureFlag.place_facts:
    ...

  if FeatureFlag.get("place_facts"):
    ...
"""

from __future__ import annotations

from typing import Any


class FeatureFlag:
  """In-process on/off switches. Default off until a path is ready."""

  place_facts = False
  extract_image_text = False

  place_facts_ttl_days = 30
  place_facts_max_docs = 6

  @classmethod
  def get(cls, name: str) -> Any:
    """Return the value for a contextual flag/knob name."""
    try:
      return getattr(cls, name)
    except AttributeError as exc:
      raise KeyError(f"unknown feature flag {name!r}") from exc
