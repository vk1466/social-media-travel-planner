"""LLM triage suggestions for ambiguous Timeline places (not a sole judge)."""

from __future__ import annotations

import json
import logging
from typing import Any, Literal

from travelplanner.categories import category_from_osm
from travelplanner.models import Place

logger = logging.getLogger(__name__)

Suggestion = Literal["keep", "discard", "unsure"]

GATE_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "suggestion": {
      "type": "string",
      "enum": ["keep", "discard", "unsure"],
      "description": "Suggested action for the user review queue",
    },
    "reason": {
      "type": "string",
      "description": "One short sentence",
    },
  },
  "required": ["suggestion", "reason"],
  "additionalProperties": False,
}

SYSTEM_PROMPT = """\
You help a travel app triage ambiguous visited places for a human review queue.

Return suggestion:
- keep: clear travel memory (attraction, trail, hotel, memorable trip restaurant, etc.)
- discard: everyday errand / noise (gas, parking, grocery, salon, chain fast-food near home, etc.)
- unsure: could go either way — user should decide

Do not invent facts. Prefer unsure when ambiguous.
"""

# Strong travel tags — auto-save, skip review + LLM.
_TRUSTED_OSM = frozenset({
  ("tourism", "attraction"),
  ("tourism", "viewpoint"),
  ("tourism", "museum"),
  ("tourism", "hotel"),
  ("tourism", "motel"),
  ("tourism", "hostel"),
  ("tourism", "guest_house"),
  ("tourism", "camp_site"),
  ("tourism", "picnic_site"),
  ("tourism", "information"),
  ("tourism", "artwork"),
  ("tourism", "apartment"),
  ("historic", "monument"),
  ("historic", "memorial"),
  ("historic", "castle"),
  ("leisure", "park"),
  ("leisure", "nature_reserve"),
  ("natural", "peak"),
  ("natural", "waterfall"),
  ("natural", "beach"),
  ("natural", "cliff"),
  ("highway", "path"),
  ("highway", "footway"),
  ("highway", "steps"),
  ("amenity", "place_of_worship"),
  ("amenity", "restaurant"),
  ("amenity", "cafe"),
  ("amenity", "bar"),
  ("amenity", "pub"),
  ("craft", "brewery"),
})

_TRUSTED_CATEGORIES = frozenset({
  "landmark",
  "viewpoint",
  "hike",
  "park",
  "beach",
  "waterfall",
  "museum",
  "hotel",
  "restaurant",
  "cafe",
  "bar",
})


def needs_user_review(place: Place) -> bool:
  """True when place should go to the user review queue (not auto-saved)."""
  loc = place.location
  osm_class = (loc.osm_class or "").strip().lower()
  osm_type = (loc.osm_type or "").strip().lower()
  if osm_type == "fast_food":
    return True
  if (osm_class, osm_type) in _TRUSTED_OSM:
    return False
  if place.category in _TRUSTED_CATEGORIES and osm_type != "fast_food":
    return False
  if category_from_osm(loc.osm_class, loc.osm_type) in _TRUSTED_CATEGORIES:
    if osm_type == "fast_food":
      return True
    return False
  return True


# Back-compat alias used by older tests / imports.
needs_llm_travel_gate = needs_user_review


def suggest_travel_place(place: Place) -> tuple[Suggestion, str]:
  """Optional LLM triage hint for the review queue.

  Never auto-decides. Missing API / errors → unsure.
  """
  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  if not settings.openai_api_key():
    return "unsure", "No AI suggestion available"

  loc = place.location
  user = (
    f"name={place.display_name!r}\n"
    f"city={loc.city!r}\n"
    f"state={loc.state_province!r}\n"
    f"country={loc.country!r}\n"
    f"osm_class={loc.osm_class!r}\n"
    f"osm_type={loc.osm_type!r}\n"
    f"category={place.category!r}\n"
    f"lat={loc.latitude}\n"
    f"lon={loc.longitude}"
  )

  try:
    client = get_client()
    response = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "timeline_travel_suggestion",
          "schema": GATE_SCHEMA,
          "strict": True,
        },
      },
      messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
      ],
    )
  except Exception as exc:
    logger.warning("llm_suggest openai error place=%r error=%s", place.display_name, exc)
    return "unsure", f"AI suggestion unavailable ({exc})"

  content = (response.choices[0].message.content or "").strip()
  if not content:
    return "unsure", "AI suggestion empty"
  try:
    data = json.loads(content)
  except json.JSONDecodeError:
    return "unsure", "AI suggestion invalid"

  raw = str(data.get("suggestion") or "unsure").strip().lower()
  suggestion: Suggestion = raw if raw in {"keep", "discard", "unsure"} else "unsure"
  reason = str(data.get("reason") or "").strip() or suggestion
  logger.info(
    "llm_suggest place=%r suggestion=%s reason=%s",
    place.display_name,
    suggestion,
    reason,
  )
  return suggestion, reason


def llm_is_travel_place(place: Place) -> tuple[bool, str]:
  """Deprecated sole-judge API — maps suggestion to bool for old callers."""
  suggestion, reason = suggest_travel_place(place)
  return suggestion == "keep", reason
