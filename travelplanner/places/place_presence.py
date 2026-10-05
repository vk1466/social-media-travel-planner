"""Jev check: does this text already name a visitable place?"""

from __future__ import annotations

import logging

from travelplanner.clients.jev import system_one

logger = logging.getLogger(__name__)

# A weak yes still falls through to video analysis. Only a confident yes skips it.
PLACE_NAMED_NOUL_MIN = 0.8

_NAMED_PLACE = {
  "named_place": {
    "type": "noul",
    "instructions": (
      "This text names at least one specific place a person can visit, such as "
      "a park, trail, beach, museum, restaurant, cafe, bar, hotel, market, or "
      "landmark. A city, state, or country alone does not count."
    ),
  }
}


def places_named_in_text(text: str) -> bool:
  """True when Jev is confident the text names a visitable place.

  False when the text is empty, Jev is unavailable, or the yes probability
  is below PLACE_NAMED_NOUL_MIN. A false answer sends the reel to video analysis.
  """
  if not text.strip():
    return False
  try:
    payload = system_one(state=text, questions=_NAMED_PLACE)
  except Exception as exc:
    logger.warning("place presence check failed error=%s", exc)
    return False

  answer = (payload.get("answers") or {}).get("named_place") or {}
  raw_noul = answer.get("noul")
  try:
    noul = float(raw_noul)
  except (TypeError, ValueError):
    logger.warning("place presence check invalid noul=%r", raw_noul)
    return False

  named = noul >= PLACE_NAMED_NOUL_MIN
  logger.info("place presence check noul=%.2f named=%s", noul, named)
  return named
