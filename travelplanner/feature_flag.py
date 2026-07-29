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
    "extract_image_text": False,
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
