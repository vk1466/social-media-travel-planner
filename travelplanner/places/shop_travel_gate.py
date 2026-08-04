"""LLM gate for ambiguous OSM shops (neither clear errand nor clear destination)."""

from __future__ import annotations

import json
import logging
from typing import Any

from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention

logger = logging.getLogger(__name__)

GATE_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "keep": {
      "type": "boolean",
      "description": "True if travelers would visit this place as a destination",
    },
    "reason": {
      "type": "string",
      "description": "One short sentence",
    },
  },
  "required": ["keep", "reason"],
  "additionalProperties": False,
}

SYSTEM_PROMPT = """\
You help a travel app decide whether an OpenStreetMap shop pin is a travel
destination worth saving from a social-media place mention.

Keep (true) when the place is something travelers seek out:
- specialty bakery, café, deli, chocolate shop, wine bar shop, ice cream
- bookstore, gallery-like craft/art shop, gift/souvenir destination
- outdoor / bike specialty store that is a known stop

Discard (false) when it is everyday retail / errands:
- clothing, mall kiosk, generic shop=yes, phone store, salon-adjacent retail
- places people mention only as a landmark for directions

Use the mention category and surrounding text hints when present.
Do not invent facts. Prefer discard when unsure.
"""


def llm_ambiguous_shop_is_travel(
  location: PlaceLocation,
  mention: PlaceMention | None = None,
) -> tuple[bool, str]:
  """Return (keep, reason). Fail-soft to discard when OpenAI is unavailable."""
  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  if not settings.openai_api_key():
    return False, "shop travel gate skipped: OpenAI not configured"

  parts = [
    f"display_name={location.display_name!r}",
    f"osm_class={location.osm_class!r}",
    f"osm_type={location.osm_type!r}",
    f"city={location.city!r}",
    f"country={location.country!r}",
  ]
  if mention is not None:
    parts.append(f"mention_name={mention.place_name!r}")
    parts.append(f"mention_category={mention.category!r}")
    if mention.details:
      parts.append(f"mention_details={mention.details!r}")
    if mention.parent_place_name:
      parts.append(f"parent_place_name={mention.parent_place_name!r}")

  try:
    client = get_client()
    if client is None:
      return False, "shop travel gate skipped: OpenAI client unavailable"
    response = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "shop_travel_gate",
          "schema": GATE_SCHEMA,
          "strict": True,
        },
      },
      messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "\n".join(parts)},
      ],
    )
  except Exception as exc:
    logger.warning("shop travel gate openai error: %s", exc)
    return False, f"shop travel gate unavailable ({exc})"

  content = (response.choices[0].message.content or "").strip()
  try:
    data = json.loads(content)
  except json.JSONDecodeError:
    return False, "shop travel gate invalid response"

  keep = bool(data.get("keep"))
  reason = str(data.get("reason") or "").strip() or ("keep" if keep else "discard")
  logger.info(
    "shop travel gate name=%r keep=%s reason=%s",
    location.display_name,
    keep,
    reason,
  )
  return keep, reason
