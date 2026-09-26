"""Pick reels that add the most new tourist places.

Jev counts places in each caption, then decides whether the next reel still
adds somewhere the earlier reels did not name.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from travelplanner.clients.jev import system_one

logger = logging.getLogger(__name__)

_PLACE_COUNT = {
  "places": {
    "type": "noul",
    "instructions": (
      "How many distinct tourist destinations does this reel name? "
      "Count landmarks, museums, parks, beaches, neighborhoods, markets, "
      "viewpoints, and hikes in the city or on a day trip from it. "
      "Do not count the city itself, hotels, restaurants, cafes, or bars. "
      "Answer 0 when it names none."
    ),
  }
}

_ADDS_PLACE = {
  "adds": {
    "type": "choice",
    "instructions": (
      "Keep this reel only when it names at least one tourist destination "
      "that is not already covered. Skip when it only repeats covered places, "
      "or names none. Tourist destinations are landmarks, museums, parks, "
      "beaches, neighborhoods, markets, viewpoints, and hikes. "
      "Ignore the city itself, hotels, restaurants, cafes, and bars."
    ),
    "criteria": {
      "keep": "Names at least one new tourist destination.",
      "skip": "No new tourist destination beyond the covered reels.",
    },
  }
}


def _snippet(reel: dict[str, str | None]) -> str:
  author = reel.get("author") or "unknown"
  caption = (reel.get("caption") or "").strip() or "(no caption)"
  query = reel.get("search_query") or ""
  via = f" via {query}" if query else ""
  return f"@{author}{via}: {caption[:220]}"


def _count_places(reel: dict[str, str | None], *, city: str) -> int:
  state = f"CITY: {city}\n\nREEL:\n{_snippet(reel)}"
  try:
    payload = system_one(state=state, questions=_PLACE_COUNT)
    answer = payload["answers"].get("places") or {}
    count = answer.get("noul")
    if isinstance(count, (int, float)):
      return max(0, int(count))
  except Exception:
    logger.exception("jev place count failed url=%s", reel.get("post_url"))
  return 0


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
  """Rank reels with Jev and keep up to `limit` that add new places."""
  if limit < 1 or not reels:
    return []

  workers = min(8, len(reels))
  with ThreadPoolExecutor(max_workers=workers) as pool:
    counts = list(pool.map(lambda reel: _count_places(reel, city=city), reels))

  ranked = sorted(
    zip(counts, reels, strict=True),
    key=lambda item: item[0],
    reverse=True,
  )
  ranked = [(count, reel) for count, reel in ranked if count > 0]
  if not ranked:
    return []

  selected: list[dict[str, str | None]] = []
  covered: list[str] = []
  for count, reel in ranked:
    if len(selected) >= limit:
      break
    if covered and not _adds_place(reel, city=city, covered=covered):
      logger.info(
        "jev skip repeat reel url=%s places=%d",
        reel.get("post_url"),
        count,
      )
      continue
    selected.append(reel)
    covered.append(_snippet(reel))
    logger.info(
      "jev keep reel url=%s places=%d selected=%d",
      reel.get("post_url"),
      count,
      len(selected),
    )
  return selected
