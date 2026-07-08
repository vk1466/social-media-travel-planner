from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from travelplanner.models import TAGS, ExtractedPlace, Place

PLACE_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
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
          "tags": {
            "type": "array",
            "items": {"type": "string", "enum": list(TAGS)},
            "description": "Activity/type tags that apply to this place, chosen from the allowed list",
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
          "tags",
          "parent_place_name",
        ],
        "additionalProperties": False,
      },
    }
  },
  "required": ["places"],
  "additionalProperties": False,
}

REEL_EXTRACT_PROMPT = (
  "Extract every specific, pin-able travel place mentioned in this Instagram reel "
  "across the caption, video transcript, top comments, hashtags, and location tag. "
  "Deduplicate places that appear in more than one source into a single entry, "
  "merging their details and tips. Captions often use numbered lists, "
  "'Day 1 / Day 2', bullets, and pin emoji markers like '📍 Place Name'.\n\n"
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
  "Use details for one short sentence of context. Use tips for short, concrete "
  "actionable phrases drawn from anywhere in the reel. Pick tags only from the "
  "allowed list."
)


@dataclass(frozen=True)
class ReelBundle:
  caption: str
  hashtags: tuple[str, ...] = ()
  top_comments: tuple[str, ...] = ()
  location_tag: Place | None = None
  transcript: str | None = None


def _optional_str(value: Any) -> str | None:
  if value is None:
    return None
  text = str(value).strip()
  return text or None


def _normalize_place_name(name: str) -> str:
  return name.strip().lower()


def _extracted_richness(extracted: ExtractedPlace) -> int:
  score = len(extracted.tips) + len(extracted.tags)
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

    tags_raw = item.get("tags", [])
    tags: tuple[str, ...] = ()
    if isinstance(tags_raw, list):
      tags = tuple(
        tag
        for tag in (_optional_str(value) for value in tags_raw)
        if tag is not None and tag in TAGS
      )

    extracted.append(
      ExtractedPlace(
        place_name=place_name,
        city=_optional_str(item.get("city")),
        country=_optional_str(item.get("country")),
        state_province=_optional_str(item.get("state_province")),
        details=_optional_str(item.get("details")),
        tips=tips,
        tags=tags,
        parent_place_name=_optional_str(item.get("parent_place_name")),
      )
    )

  return tuple(extracted)


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


def fetch_places_from_reel(bundle: ReelBundle) -> tuple[ExtractedPlace, ...]:
  """Extract places from all reel sources via one OpenAI structured-output call."""
  content = format_reel_bundle(bundle).strip()
  if not content:
    return ()

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  client = get_client()
  if client is None:
    return ()

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
    return ()

  message_content = response.choices[0].message.content
  if not message_content:
    return ()

  try:
    data = json.loads(message_content)
  except (json.JSONDecodeError, TypeError):
    return ()

  return _dedupe_by_name(_parse_extracted_places(data if isinstance(data, dict) else None))


def fetch_places_from_text(text: str) -> tuple[ExtractedPlace, ...]:
  """Backward-compatible wrapper for caption-only extraction."""
  return fetch_places_from_reel(ReelBundle(caption=text))
