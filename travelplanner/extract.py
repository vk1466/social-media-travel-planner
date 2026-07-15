from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from travelplanner.categories import (
  ALL_ATTRIBUTES,
  CATEGORIES,
  attribute_allowlist_prompt_lines,
  filter_attributes,
  normalize_category,
)
from travelplanner.place_hints import ExtractedPlace, PlatformPlace

logger = logging.getLogger(__name__)

PLACE_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "reel_summary": {
      "type": ["string", "null"],
      "description": (
        "2-3 sentence traveler-facing summary of what this reel is about and why "
        "someone would go. Neutral and concrete — not marketing hype. Null if the "
        "reel has no usable travel content"
      ),
    },
    "places": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "place_name": {
            "type": "string",
            "description": (
              "Specific pin-able travel destination (park, trail, lake, waterfall, "
              "viewpoint, museum, restaurant, hotel, landmark). Not a business or service"
            ),
          },
          "city": {
            "type": ["string", "null"],
            "description": (
              "Real city or town only. Null if unknown. Never a mountain, park, lake, "
              "trail, gorge, coast, region, state, or parent attraction"
            ),
          },
          "state_province": {
            "type": ["string", "null"],
            "description": "State or province name (e.g. Oregon, Washington). Null if unknown",
          },
          "country": {
            "type": ["string", "null"],
            "description": "Country name (e.g. USA). Null if unknown",
          },
          "details": {
            "type": ["string", "null"],
            "description": "One short sentence of context about this place",
          },
          "tips": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Short, concrete tips or recommendations for this place",
          },
          "category": {
            "type": "string",
            "enum": list(CATEGORIES),
            "description": (
              "Exactly one browse type for this pin, chosen from the allowed list"
            ),
          },
          "attributes": {
            "type": "array",
            "items": {"type": "string", "enum": list(ALL_ATTRIBUTES)},
            "description": (
              "Secondary facets for this place, chosen only from the allowlist for "
              "its category. Empty array when none apply. Not a second category"
            ),
          },
          "parent_place_name": {
            "type": ["string", "null"],
            "description": (
              "Broader containing attraction (national park, state park, mountain, gorge, "
              "area). Null if the place stands alone"
            ),
          },
        },
        "required": [
          "place_name",
          "city",
          "state_province",
          "country",
          "details",
          "tips",
          "category",
          "attributes",
          "parent_place_name",
        ],
        "additionalProperties": False,
      },
    },
  },
  "required": ["reel_summary", "places"],
  "additionalProperties": False,
}

REEL_EXTRACT_PROMPT = (
  "Extract every specific, pin-able travel place mentioned in this Instagram reel "
  "across the caption, video transcript, top comments, hashtags, and location tag. "
  "Deduplicate places that appear in more than one source into a single entry, "
  "merging their details and tips. Captions often use numbered lists, "
  "'Day 1 / Day 2', bullets, and pin emoji markers like '📍 Place Name'.\n\n"
  "Also write reel_summary: 2-3 short sentences summarizing the reel for a traveler "
  "(what/where and why go). Be concrete and neutral — no hype, no hashtags, no "
  "emojis. Null only if there is no usable travel content.\n\n"
  "Location fields are used for geocoding. Follow these rules exactly:\n"
  "1. place_name — the specific attraction (e.g. 'Picture Lake', 'Tunnel Falls', "
  "'Misery Ridge Trail', 'Crater Lake National Park').\n"
  "2. city — a real city or town only, or null if unknown. Never put mountains, "
  "parks, lakes, trails, gorges, coastlines, regions, states, or parent "
  "attractions here. Wrong: city='Mt. Baker' for Picture Lake. Wrong: "
  "city='Smith Rock State Park' for Misery Ridge Trail. Wrong: city='Oregon' "
  "or city='Oregon Coast'.\n"
  "3. state_province — the state or province (e.g. Oregon, Washington), or null "
  "if unknown. Never put this in city.\n"
  "4. country — the country (e.g. USA), or null if unknown.\n"
  "5. parent_place_name — the broader containing attraction when inferable "
  "(e.g. Picture Lake → 'Mt. Baker'; Misery Ridge Trail → 'Smith Rock State "
  "Park'; Tunnel Falls → 'Columbia River Gorge'). Null if the place stands "
  "alone.\n"
  "6. Skip vague regions as standalone places — do not extract 'Pacific Northwest', "
  "'Oregon Coast', a state alone, or a country alone.\n"
  "7. When the caption gives 'Place, Area, State' (e.g. '📍 Picture Lake, Mt. Baker, "
  "Washington'), use Place as place_name, Area as parent_place_name, and State as "
  "state_province — not city.\n"
  "8. Travel destinations only — extract places a tourist would visit: parks, trails, "
  "lakes, waterfalls, landmarks, museums, restaurants, hotels, viewpoints. Skip real "
  "estate offices, generic businesses, services, and commercial listings even if a "
  "name appears in the caption or comments.\n\n"
  "Category and attributes (exactly one category per place):\n"
  "1. Category = what the pin is (visit action / venue type) — pick from the enum.\n"
  "2. Attributes = extra facets only, never a second category. Emit every "
  "allowlisted attribute that clearly applies; use [] only when none apply.\n"
  "3. Parents → park or neighborhood; children → the activity pin type "
  "(hike, viewpoint, waterfall, etc.).\n"
  "4. If torn between two categories, pick the more specific visit action "
  "(hike > park for a trail pin; waterfall > landmark for a named falls).\n"
  "5. Never emit two categories; never invent values outside the enums.\n"
  "6. If the place name is a waterfall / falls / cascade (e.g. Victoria Falls, "
  "Multnomah Falls, Tunnel Falls) → category=waterfall — never viewpoint, "
  "landmark, or park.\n"
  "7. Trail / scramble / climb as the visit → category=hike; put views in "
  "attributes as viewpoint when relevant.\n"
  "8. Monument / statue / temple / citadel as the visit → category=landmark; "
  "add hike or viewpoint attributes when visitors also hike or look out.\n"
  "9. For viewpoint / waterfall / beach pins, if visitors walk or hike to reach "
  "them, include attribute hike.\n\n"
  "Allowed attributes by category (use only these values):\n"
  f"{attribute_allowlist_prompt_lines()}\n\n"
  "Use details for one short sentence of context. Use tips for short, concrete "
  "actionable phrases drawn from anywhere in the reel."
)


@dataclass(frozen=True)
class ReelBundle:
  caption: str
  hashtags: tuple[str, ...] = ()
  top_comments: tuple[str, ...] = ()
  location_tag: PlatformPlace | None = None
  transcript: str | None = None


@dataclass(frozen=True)
class ReelExtraction:
  places: tuple[ExtractedPlace, ...] = ()
  reel_summary: str | None = None


def _optional_str(value: Any) -> str | None:
  if value is None:
    return None
  text = str(value).strip()
  return text or None


def _normalize_place_name(name: str) -> str:
  return name.strip().lower()


def _extracted_richness(extracted: ExtractedPlace) -> int:
  score = len(extracted.tips) + len(extracted.attributes)
  if extracted.category:
    score += 1
  if extracted.details:
    score += 1
  if extracted.city:
    score += 1
  if extracted.state_province:
    score += 1
  if extracted.country:
    score += 1
  if extracted.parent_place_name:
    score += 1
  return score


def _dedupe_by_name(
  extracted_places: tuple[ExtractedPlace, ...],
) -> tuple[ExtractedPlace, ...]:
  best: dict[str, ExtractedPlace] = {}
  for place in extracted_places:
    key = _normalize_place_name(place.place_name)
    existing = best.get(key)
    if existing is None or _extracted_richness(place) > _extracted_richness(existing):
      best[key] = place
  return tuple(best.values())


def _parse_extracted_places(data: dict[str, Any] | None) -> tuple[ExtractedPlace, ...]:
  if not data:
    return ()

  places_raw = data.get("places", [])
  if not isinstance(places_raw, list):
    return ()

  extracted: list[ExtractedPlace] = []
  for item in places_raw:
    if not isinstance(item, dict):
      continue

    place_name = _optional_str(item.get("place_name"))
    if not place_name:
      continue

    tips_raw = item.get("tips", [])
    tips: tuple[str, ...] = ()
    if isinstance(tips_raw, list):
      tips = tuple(
        tip
        for tip in (_optional_str(value) for value in tips_raw)
        if tip is not None
      )

    category = normalize_category(_optional_str(item.get("category")))
    attrs_raw = item.get("attributes", [])
    attributes: tuple[str, ...] = ()
    if isinstance(attrs_raw, list):
      attributes = filter_attributes(
        category,
        tuple(attr for attr in (_optional_str(value) for value in attrs_raw) if attr is not None),
      )

    extracted.append(
      ExtractedPlace(
        place_name=place_name,
        city=_optional_str(item.get("city")),
        country=_optional_str(item.get("country")),
        state_province=_optional_str(item.get("state_province")),
        details=_optional_str(item.get("details")),
        tips=tips,
        category=category,
        attributes=attributes,
        parent_place_name=_optional_str(item.get("parent_place_name")),
      )
    )

  return tuple(extracted)


def _parse_reel_extraction(data: dict[str, Any] | None) -> ReelExtraction:
  if not data:
    return ReelExtraction()
  return ReelExtraction(
    places=_dedupe_by_name(_parse_extracted_places(data)),
    reel_summary=_optional_str(data.get("reel_summary")),
  )


def format_reel_bundle(bundle: ReelBundle) -> str:
  sections: list[str] = []

  if bundle.location_tag is not None:
    location_parts = [bundle.location_tag.place_name]
    if bundle.location_tag.city:
      location_parts.append(bundle.location_tag.city)
    if bundle.location_tag.country:
      location_parts.append(bundle.location_tag.country)
    sections.append("IG LOCATION TAG: " + ", ".join(location_parts))

  caption = bundle.caption.strip()
  if caption:
    sections.append(f"CAPTION:\n{caption}")

  if bundle.hashtags:
    sections.append("HASHTAGS: " + " ".join(f"#{tag}" for tag in bundle.hashtags))

  if bundle.top_comments:
    comment_lines = "\n".join(f"- {comment}" for comment in bundle.top_comments)
    sections.append(f"TOP COMMENTS:\n{comment_lines}")

  transcript = (bundle.transcript or "").strip()
  if transcript:
    sections.append(f"VIDEO TRANSCRIPT:\n{transcript}")

  return "\n\n".join(sections)


def fetch_places_from_reel(bundle: ReelBundle) -> ReelExtraction:
  """Extract reel summary + places from all reel sources via one OpenAI call."""
  content = format_reel_bundle(bundle).strip()
  if not content:
    logger.info("extract skipped: empty reel bundle")
    return ReelExtraction()

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  client = get_client()
  if client is None:
    logger.warning("extract skipped: OPENAI_API_KEY not set")
    return ReelExtraction()

  logger.info(
    "extract start model=%s content_chars=%d has_transcript=%s has_location_tag=%s",
    settings.openai_model(),
    len(content),
    bool((bundle.transcript or "").strip()),
    bundle.location_tag is not None,
  )
  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      messages=[
        {"role": "system", "content": REEL_EXTRACT_PROMPT},
        {"role": "user", "content": content},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "extracted_places",
          "strict": True,
          "schema": PLACE_EXTRACT_SCHEMA,
        },
      },
    )
  except Exception:
    logger.exception("extract openai call failed")
    return ReelExtraction()

  message_content = response.choices[0].message.content
  if not message_content:
    logger.warning("extract empty openai response")
    return ReelExtraction()

  try:
    data = json.loads(message_content)
  except (json.JSONDecodeError, TypeError):
    logger.exception("extract invalid json from openai")
    return ReelExtraction()

  result = _parse_reel_extraction(data if isinstance(data, dict) else None)
  logger.info(
    "extract done places=%d has_summary=%s names=%s",
    len(result.places),
    bool(result.reel_summary),
    [place.place_name for place in result.places],
  )
  return result


def fetch_places_from_text(text: str) -> tuple[ExtractedPlace, ...]:
  """Backward-compatible wrapper for caption-only extraction."""
  return fetch_places_from_reel(ReelBundle(caption=text)).places
