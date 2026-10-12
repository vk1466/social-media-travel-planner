"""Jev fallback: pick among real geocode candidates (never invents coordinates)."""

from __future__ import annotations

import logging

from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.clients.jev import system_one
from travelplanner.place_hints import PlaceMention

logger = logging.getLogger(__name__)

_PICK_INSTRUCTIONS = (
  "Pick the map pin that is the named place. "
  "Prefer the place itself over a road, parking lot, bike share, office, "
  "or a building that only sits inside a larger area. "
  "Choose none when no pin is that place."
)


def _mention_context(mention: PlaceMention) -> str:
  parts = [f"PLACE: {mention.place_name}"]
  if mention.category:
    parts.append(f"CATEGORY: {mention.category}")
  if mention.details:
    parts.append(f"DETAILS: {mention.details}")
  if mention.parent_place_name:
    parts.append(f"PARENT: {mention.parent_place_name}")
  if mention.city:
    parts.append(f"CITY: {mention.city}")
  if mention.state_province:
    parts.append(f"STATE: {mention.state_province}")
  if mention.country:
    parts.append(f"COUNTRY: {mention.country}")
  return "\n".join(parts)


def _candidate_label(candidate: GeocodeResult) -> str:
  where = ", ".join(
    part
    for part in (candidate.city, candidate.state_province, candidate.country)
    if part
  )
  category = candidate.category or "unknown"
  located = f" in {where}" if where else ""
  return f"{candidate.display_name} ({category}){located}"


def _pick_question(candidates: list[GeocodeResult]) -> dict:
  criteria = {
    str(index): _candidate_label(candidate) for index, candidate in enumerate(candidates)
  }
  criteria["none"] = "None of these pins is the named place."
  return {
    "pin": {
      "type": "choice",
      "instructions": _PICK_INSTRUCTIONS,
      "criteria": criteria,
    }
  }


def pick_candidate_index(
  mention: PlaceMention,
  candidates: list[GeocodeResult],
) -> tuple[int | None, str]:
  """Ask Jev to pick a candidate index, or None to reject all.

  Returns (index_or_none, note). On missing API key / errors, returns
  (None, note) without raising — caller keeps the deterministic pick.
  """
  if not candidates:
    return None, "llm_pick skipped: no candidates"

  logger.info(
    "llm_pick start place_name=%r candidates=%d",
    mention.place_name,
    len(candidates),
  )
  try:
    payload = system_one(
      state=_mention_context(mention),
      questions=_pick_question(candidates),
    )
  except Exception as exc:
    logger.warning("llm_pick jev error place_name=%r error=%s", mention.place_name, exc)
    return None, f"llm_pick error: {exc}"

  answer = (payload.get("answers") or {}).get("pin") or {}
  choice = answer.get("choice")
  if choice == "none":
    note = "llm_pick rejected all (jev)"
    logger.info("llm_pick place_name=%r %s", mention.place_name, note)
    return None, note
  if not isinstance(choice, str) or not choice.isdigit():
    note = f"llm_pick error: invalid choice {choice!r}"
    logger.warning("llm_pick place_name=%r %s", mention.place_name, note)
    return None, note
  chosen = int(choice)
  if chosen < 0 or chosen >= len(candidates):
    note = f"llm_pick error: invalid index {chosen}"
    logger.warning("llm_pick place_name=%r %s", mention.place_name, note)
    return None, note
  note = f"llm_pick chose #{chosen} (jev)"
  logger.info("llm_pick place_name=%r %s", mention.place_name, note)
  return chosen, note
