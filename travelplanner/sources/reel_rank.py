"""Two caption filters before a reel is fetched in full.

Jev first drops reels that are not travel. It then drops travel reels whose
places mostly repeat ones already chosen. Only the survivors are ingested.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

from travelplanner.clients.jev import system_one

logger = logging.getLogger(__name__)

_IS_TRAVEL = {
  "travel": {
    "type": "choice",
    "instructions": (
      "Decide from the caption alone, before any transcript. "
      "Travel means the reel is about visiting this city or a day trip from it: "
      "sights, neighborhoods, itineraries, or day trips. "
      "Not travel means another topic, a different place, an ad, a meme, "
      "or nothing a visitor would go see."
    ),
    "criteria": {
      "travel": "About visiting this city or a day trip from it.",
      "not_travel": "Not a travel reel for this city.",
    },
  }
}

_ADDS_PLACE = {
  "adds": {
    "type": "choice",
    "instructions": (
      "Skip this reel when too many of its tourist places are already covered. "
      "Keep it when most of the places it names are still new. "
      "Tourist destinations are landmarks, museums, parks, beaches, "
      "neighborhoods, markets, viewpoints, and hikes. "
      "Ignore the city itself, hotels, restaurants, cafes, and bars. "
      "One repeated landmark plus several new places is still keep."
    ),
    "criteria": {
      "keep": "Most of its tourist places are not already covered.",
      "skip": "Too much overlap with places already covered.",
    },
  }
}


def _snippet(reel: dict[str, str | None]) -> str:
  author = reel.get("author") or "unknown"
  caption = (reel.get("caption") or "").strip() or "(no caption)"
  query = reel.get("search_query") or ""
  via = f" via {query}" if query else ""
  return f"@{author}{via}: {caption[:220]}"


def _is_travel(reel: dict[str, str | None], *, city: str) -> bool:
  state = f"CITY: {city}\n\nREEL:\n{_snippet(reel)}"
  try:
    payload = system_one(state=state, questions=_IS_TRAVEL)
    answer = payload["answers"].get("travel") or {}
    return answer.get("choice") == "travel"
  except Exception:
    logger.exception("jev travel check failed url=%s", reel.get("post_url"))
    return False


def _adds_place(
  reel: dict[str, str | None],
  *,
  city: str,
  covered: list[str],
) -> bool:
  covered_block = "\n".join(f"- {line}" for line in covered)
  state = (
    f"CITY: {city}\n\n"
    f"ALREADY COVERED REELS:\n{covered_block}\n\n"
    f"REEL TO JUDGE:\n{_snippet(reel)}"
  )
  try:
    payload = system_one(state=state, questions=_ADDS_PLACE)
    answer = payload["answers"].get("adds") or {}
    return answer.get("choice") == "keep"
  except Exception:
    logger.exception("jev diversity check failed url=%s", reel.get("post_url"))
    return False


def select_diverse_reels(
  reels: list[dict[str, str | None]],
  *,
  city: str,
  limit: int,
) -> list[dict[str, str | None]]:
  """Drop non-travel reels, then drop overlapping ones, before ingest."""
  if limit < 1 or not reels:
    return []

  workers = min(8, len(reels))
  with ThreadPoolExecutor(max_workers=workers) as pool:
    travel_flags = list(pool.map(lambda reel: _is_travel(reel, city=city), reels))
  travel_reels = [reel for reel, is_travel in zip(reels, travel_flags, strict=True) if is_travel]
  logger.info(
    "jev travel filter city=%s candidates=%d travel=%d dropped=%d",
    city,
    len(reels),
    len(travel_reels),
    len(reels) - len(travel_reels),
  )
  if not travel_reels:
    return []

  selected: list[dict[str, str | None]] = []
  covered: list[str] = []
  for reel in travel_reels:
    if len(selected) >= limit:
      break
    if covered and not _adds_place(reel, city=city, covered=covered):
      logger.info("jev skip overlapping reel url=%s", reel.get("post_url"))
      continue
    selected.append(reel)
    covered.append(_snippet(reel))
    logger.info(
      "jev keep reel url=%s selected=%d",
      reel.get("post_url"),
      len(selected),
    )
  return selected
