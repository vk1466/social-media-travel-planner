"""LLM fallback: pick among real geocode candidates (never invents coordinates)."""

from __future__ import annotations

import json
from typing import Any

from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.place_hints import PlaceMention

PICK_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "chosen_index": {
      "type": ["integer", "null"],
      "description": (
        "0-based index of the best matching candidate for the travel place, "
        "or null if none of the candidates is a correct match"
      ),
    },
    "reason": {
      "type": "string",
      "description": "One short sentence explaining the choice",
    },
  },
  "required": ["chosen_index", "reason"],
  "additionalProperties": False,
}

SYSTEM_PROMPT = """\
You help a travel app pick the correct map pin from geocoder candidates.

Rules:
- Choose the candidate that best matches the intended travel destination
  (attraction, trail, peak, lake, park, landmark, restaurant, etc.).
- Prefer the specific place over a same-named road, parking lot, office, or
  unrelated town in another country/region.
- Use parent place / region hints when present.
- If none of the candidates is a correct match, return chosen_index=null.
- Never invent coordinates or new places — only pick from the numbered list.
"""


def _mention_context(mention: PlaceMention) -> str:
  parts = [f"place_name: {mention.place_name}"]
  if mention.parent_place_name:
    parts.append(f"parent_place_name: {mention.parent_place_name}")
  if mention.city:
    parts.append(f"city: {mention.city}")
  if mention.state_province:
    parts.append(f"state_province: {mention.state_province}")
  if mention.country:
    parts.append(f"country: {mention.country}")
  if mention.latitude is not None and mention.longitude is not None:
    parts.append(f"hint_coords: {mention.latitude},{mention.longitude}")
  return "\n".join(parts)


def _format_candidates(candidates: list[GeocodeResult]) -> str:
  lines: list[str] = []
  for index, candidate in enumerate(candidates):
    lines.append(
      f"{index}. name={candidate.display_name!r} "
      f"category={candidate.category!r} "
      f"country={candidate.country!r} "
      f"state={candidate.state_province!r} "
      f"city={candidate.city!r} "
      f"lat={candidate.latitude:.5f} lon={candidate.longitude:.5f}"
    )
  return "\n".join(lines)


def pick_candidate_index(
  mention: PlaceMention,
  candidates: list[GeocodeResult],
) -> tuple[int | None, str]:
  """Ask the LLM to pick a candidate index, or None to reject all.

  Returns (index_or_none, note). On missing API key / errors, returns
  (None, note) without raising — caller keeps the deterministic pick.
  """
  if not candidates:
    return None, "llm_pick skipped: no candidates"

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  client = get_client()
  if client is None:
    return None, "llm_pick skipped: OPENAI_API_KEY not set"

  user_content = (
    "Intended place:\n"
    f"{_mention_context(mention)}\n\n"
    "Candidates:\n"
    f"{_format_candidates(candidates)}\n\n"
    "Pick the best candidate index, or null if none fit."
  )

  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "locate_candidate_pick",
          "strict": True,
          "schema": PICK_SCHEMA,
        },
      },
    )
  except Exception as exc:
    return None, f"llm_pick error: {exc}"

  content = response.choices[0].message.content if response.choices else None
  if not content:
    return None, "llm_pick error: empty response"

  try:
    data = json.loads(content)
  except json.JSONDecodeError:
    return None, "llm_pick error: invalid JSON"

  chosen = data.get("chosen_index")
  reason = str(data.get("reason") or "").strip() or "no reason"
  if chosen is None:
    return None, f"llm_pick rejected all ({reason})"
  if not isinstance(chosen, int) or chosen < 0 or chosen >= len(candidates):
    return None, f"llm_pick invalid index {chosen!r} ({reason})"
  return chosen, f"llm_pick chose #{chosen} ({reason})"
