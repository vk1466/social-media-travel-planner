"""Product feature toggles.

Flip or add flags here by hand. Call sites check the attribute directly:

  from travelplanner.features import Features

  if Features.place_facts:
    ...
"""

from __future__ import annotations


class Features:
  """In-process on/off switches. Default off until a path is ready."""

  place_facts = False
  extract_image_text = False

  place_facts_ttl_days = 30
  place_facts_max_docs = 6
