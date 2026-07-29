"""LLM triage for Timeline places — review hints and unresolved-pin recovery."""

from __future__ import annotations

import json
import logging
from typing import Any, Literal

from travelplanner.categories import category_from_osm
from travelplanner.models import Place, PlaceLocation

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

travel_kind says when the visit happened:
- trip: during a trip away from home
- local: outside the home radius but on an ordinary day
- home: in the everyday home area
- unknown: no home reference available

Return suggestion:
- keep: clear travel memory (attraction, trail, hotel, memorable trip restaurant, etc.)
- discard: everyday errand / noise (gas, parking, grocery, salon, chain fast-food near home, etc.)
- unsure: could go either way — user should decide

Weigh travel_kind heavily for ordinary venues: a restaurant on a trip may be
worth keeping, while the same restaurant visited locally many times is routine.
visit_count is how many separate times the user went there.

Do not invent facts. Prefer unsure when ambiguous.
"""

UNRESOLVED_SYSTEM_PROMPT = """\
You help a travel app decide what to do with a Timeline stop that could not be
resolved into a clean travel place pin (geocode failed, OSM rejected the pin,
or nearby POI search found nothing).

The deterministic filters already removed obvious gas stations, highways,
pharmacies, parking, and bare street addresses. What remains might still be:
- a real destination (trailhead, lake, ranger station, viewpoint, unique lodge)
- residual noise (random building, office, unnamed pin)

travel_kind:
- trip: during travel away from home — bias toward keep/unsure for named places
- local: ordinary day outside home radius — bias toward discard unless a clear destination
- home / unknown: as labeled

Return suggestion:
- keep: worth saving as a visited travel place (will be auto-imported if we can pin it)
- discard: not travel-worthy — drop it
- unsure: user should review (queued, not auto-imported)

Do not invent coordinates or claim a specific attraction unless the name clearly
indicates one. Prefer unsure when the name is vague.
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

# Places worth keeping on their own merits, wherever and whenever visited.
DESTINATION_CATEGORIES = frozenset({
  "landmark",
  "viewpoint",
  "hike",
  "park",
  "beach",
  "waterfall",
  "museum",
  "hotel",
})

# Eating out is only a travel memory in a travel context — otherwise it is
# lunch. These need trip evidence before they get auto-saved.
FOOD_CATEGORIES = frozenset({"restaurant", "cafe", "bar"})

_TRUSTED_CATEGORIES = DESTINATION_CATEGORIES | FOOD_CATEGORIES

# Food tags carry the same caveat as food categories.
_FOOD_OSM_TYPES = frozenset({"restaurant", "cafe", "bar", "pub", "fast_food", "biergarten"})


def _is_food_place(place: Place, osm_type: str) -> bool:
  if place.category in FOOD_CATEGORIES:
    return True
  return osm_type in _FOOD_OSM_TYPES


def needs_user_review(place: Place, *, travel_kind: str = "unknown") -> bool:
  """True when place should go to the user review queue (not auto-saved).

  `travel_kind` comes from `trips.classify_travel_context`. Anything that is
  only interesting because of when it was visited ("we ate here on holiday")
  needs `trip`; genuine destinations do not.
  """
  loc = place.location
  osm_class = (loc.osm_class or "").strip().lower()
  osm_type = (loc.osm_type or "").strip().lower()
  if osm_type == "fast_food":
    return True

  if _is_food_place(place, osm_type) and travel_kind != "trip":
    return True

  if (osm_class, osm_type) in _TRUSTED_OSM:
    return False
  if place.category in _TRUSTED_CATEGORIES:
    return False
  if category_from_osm(loc.osm_class, loc.osm_type) in _TRUSTED_CATEGORIES:
    return False
  return True


# Back-compat alias used by older tests / imports.
needs_llm_travel_gate = needs_user_review


def _parse_suggestion(content: str) -> tuple[Suggestion, str]:
  try:
    data = json.loads(content)
  except json.JSONDecodeError:
    return "unsure", "AI suggestion invalid"

  raw = str(data.get("suggestion") or "unsure").strip().lower()
  suggestion: Suggestion = raw if raw in {"keep", "discard", "unsure"} else "unsure"
  reason = str(data.get("reason") or "").strip() or suggestion
  return suggestion, reason


def _llm_suggest(
  *,
  system: str,
  user: str,
  schema_name: str,
  log_label: str,
) -> tuple[Suggestion, str]:
  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  if not settings.openai_api_key():
    return "unsure", "No AI suggestion available"

  try:
    client = get_client()
    response = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": schema_name,
          "schema": GATE_SCHEMA,
          "strict": True,
        },
      },
      messages=[
        {"role": "system", "content": system},
        {"role": "user", "content": user},
      ],
    )
  except Exception as exc:
    logger.warning("llm_suggest openai error label=%s error=%s", log_label, exc)
    return "unsure", f"AI suggestion unavailable ({exc})"

  content = (response.choices[0].message.content or "").strip()
  if not content:
    return "unsure", "AI suggestion empty"
  suggestion, reason = _parse_suggestion(content)
  logger.info(
    "llm_suggest label=%s suggestion=%s reason=%s",
    log_label,
    suggestion,
    reason,
  )
  return suggestion, reason


def suggest_travel_place(
  place: Place,
  *,
  travel_kind: str = "unknown",
  visit_count: int | None = None,
) -> tuple[Suggestion, str]:
  """Optional LLM triage hint for the review queue.

  Never auto-decides. Missing API / errors → unsure.
  """
  loc = place.location
  user = (
    f"name={place.display_name!r}\n"
    f"city={loc.city!r}\n"
    f"state={loc.state_province!r}\n"
    f"country={loc.country!r}\n"
    f"osm_class={loc.osm_class!r}\n"
    f"osm_type={loc.osm_type!r}\n"
    f"category={place.category!r}\n"
    f"travel_kind={travel_kind!r}\n"
    f"visit_count={visit_count if visit_count is not None else 'unknown'}\n"
    f"lat={loc.latitude}\n"
    f"lon={loc.longitude}"
  )
  return _llm_suggest(
    system=SYSTEM_PROMPT,
    user=user,
    schema_name="timeline_travel_suggestion",
    log_label=place.display_name,
  )


def suggest_unresolved_cluster(
  *,
  place_name: str | None,
  address: str | None,
  latitude: float,
  longitude: float,
  travel_kind: str = "unknown",
  visit_count: int | None = None,
  semantic_type: str | None = None,
  location: PlaceLocation | None = None,
) -> tuple[Suggestion, str]:
  """LLM triage for pins that failed resolve after deterministic skip filters.

  Called only when skip_reason is `unresolved`. Returns keep / discard / unsure.
  Missing API / errors → unsure (safe: queue for review rather than drop).
  """
  loc = location
  display = (
    (loc.display_name if loc and loc.display_name else None)
    or place_name
    or address
    or f"({latitude:.5f}, {longitude:.5f})"
  )
  user = (
    f"name={display!r}\n"
    f"timeline_place_name={place_name!r}\n"
    f"timeline_address={address!r}\n"
    f"semantic_type={semantic_type!r}\n"
    f"travel_kind={travel_kind!r}\n"
    f"visit_count={visit_count if visit_count is not None else 'unknown'}\n"
    f"lat={latitude}\n"
    f"lon={longitude}\n"
    f"reverse_city={(loc.city if loc else None)!r}\n"
    f"reverse_state={(loc.state_province if loc else None)!r}\n"
    f"reverse_country={(loc.country if loc else None)!r}\n"
    f"osm_class={(loc.osm_class if loc else None)!r}\n"
    f"osm_type={(loc.osm_type if loc else None)!r}"
  )
  return _llm_suggest(
    system=UNRESOLVED_SYSTEM_PROMPT,
    user=user,
    schema_name="timeline_unresolved_suggestion",
    log_label=display,
  )


def llm_is_travel_place(place: Place) -> tuple[bool, str]:
  """Deprecated sole-judge API — maps suggestion to bool for old callers."""
  suggestion, reason = suggest_travel_place(place)
  return suggestion == "keep", reason
