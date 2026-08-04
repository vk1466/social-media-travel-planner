from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Sequence

from travelplanner.categories import (
  ALL_ATTRIBUTES,
  CATEGORIES,
  attribute_allowlist_prompt_lines,
  filter_attributes,
  normalize_category,
)
from travelplanner.place_hints import ExtractedPlace, PlatformPlace

if TYPE_CHECKING:
  from travelplanner.models import SavedPost

logger = logging.getLogger(__name__)

_OPENAI_MAX_RETRIES = 2
_OPENAI_RETRY_BACKOFF_SECONDS = 1.5

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
              "Clean specific pin-able name only (park, trail, lake, waterfall, "
              "viewpoint, beach, museum, restaurant, hotel, landmark). No day "
              "numbers, no emoji, no access-route suffixes in the name"
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
            "description": (
              "One short sentence of context copied or lightly paraphrased from the "
              "provided sources only. Null if sources give no place-specific context. "
              "Never invent facts"
            ),
          },
          "tips": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
              "Concrete tips grounded in the sources only: distances, times, fees, "
              "passes, parking, permits, access notes, seasonal notes. Empty array "
              "when the sources give none. Never invent generic advice"
            ),
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
              "Broader containing attraction (national park, state park, city, "
              "neighborhood, mountain, gorge). Null if the place stands alone"
            ),
          },
          "parent_category": {
            "type": ["string", "null"],
            "enum": [*list(CATEGORIES), None],
            "description": (
              "Browse category for parent_place_name when set — usually park, city, "
              "neighborhood, or landmark. Null when parent_place_name is null"
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
          "parent_category",
        ],
        "additionalProperties": False,
      },
    },
  },
  "required": ["reel_summary", "places"],
  "additionalProperties": False,
}

REEL_EXTRACT_PROMPT = (
  "Extract every specific, pin-able travel place from this Instagram reel.\n\n"
  "Sources for place NAMES (required evidence):\n"
  "- CAPTION (📍 lists, Day N itineraries, bullets, prose)\n"
  "- VIDEO TRANSCRIPT (spoken or on-screen names)\n"
  "- LOCATION TAG, HASHTAGS, and TOP COMMENTS when they name a place\n\n"
  "VIDEO SUMMARY is supporting context only. Never invent or guess a place name "
  "that does not appear explicitly in caption, transcript, location tag, hashtags, "
  "or comments — even if the summary vaguely mentions lakes, hikes, or viewpoints. "
  "If the name is not in those sources, omit it. Hashtags count as name evidence "
  "when they encode a destination (including concatenated forms).\n\n"
  "Coverage — read every line and miss no named place:\n"
  "1. Work line by line through the caption. A single line often names several "
  "places; extract each one, not just the first.\n"
  "2. Nested named spots inside a larger area are places too (visitor areas, "
  "overlooks, trails, beaches, falls called out by name).\n"
  "3. Names in parentheses, after 'via' or 'through', or in a comma-separated "
  "run are separate places — extract the destination and the named route/spot "
  "as distinct entries with clean names.\n"
  "4. When one line lists an area plus its individually named parts, extract "
  "every named part as its own place as well as the area.\n"
  "5. Also emit a named parent park, city, or neighborhood as its own place when "
  "it is pin-able and named in the sources.\n"
  "6. A hashtag that names a real destination is a place; normalise it to its "
  "proper name and extract it if it is not already covered.\n"
  "7. Skip vague regions alone — do not extract a coast, province, state, or "
  "country as a standalone place. Skip lodging-only bases unless the town itself "
  "is presented as a visit destination. Skip campgrounds unless they are the "
  "featured destination.\n"
  "8. Deduplicate the same place across sources into one entry; merge details and "
  "tips. Clean place_name — no emoji, day labels, or access-route suffixes.\n\n"
  "Also write reel_summary: 2-3 short sentences for a traveler (what/where and why "
  "go). Concrete and neutral — no hype, hashtags, or emojis. If VIDEO SUMMARY is "
  "provided, refine it using caption facts; do not invent stops. Null only if "
  "there is no usable travel content.\n\n"
  "Location fields (for geocoding):\n"
  "1. place_name — the specific attraction only.\n"
  "2. city — a real city or town only, or null if unknown. Never put mountains, "
  "parks, lakes, trails, gorges, coastlines, regions, states, or parent "
  "attractions here.\n"
  "3. state_province — state or province, or null.\n"
  "4. country — country, or null.\n"
  "5. parent_place_name — broader containing attraction when inferable; null if "
  "the place stands alone.\n"
  "6. parent_category — park, city, neighborhood, or landmark when parent is set; "
  "else null.\n"
  "7. When sources give 'Place, Area, State', use Place as place_name, Area as "
  "parent_place_name, and State as state_province — not city.\n\n"
  "Details and tips — ground strictly in the sources:\n"
  "- details: one short sentence from the source about this place, or null.\n"
  "- tips: copy every concrete fact stated for that place (distance, duration, "
  "fee/pass/parking, permit, roadside stop, seasonal). Use [] only if none.\n"
  "- Never invent generic tips unless the source says them.\n\n"
  "Category and attributes (exactly one category per place):\n"
  "1. Decide in two steps. First ask what the place IS — the noun a local would "
  "use for it (lake, waterfall, beach, park, trail, market, museum, city). Pick "
  "that category. Only then describe how you reach or experience it using "
  "attributes. Never let the access method or the caption's section heading "
  "decide the category.\n"
  "2. Choose hike only when the trail or walk itself is the destination and no "
  "other noun fits. If the place is a lake, waterfall, beach, viewpoint, or "
  "park that you happen to hike to, use that category and add the hike "
  "attribute.\n"
  "3. Parents → park, city, neighborhood, or landmark; children → the activity "
  "pin (hike, viewpoint, waterfall, lake, beach, restaurant, etc.).\n"
  "4. Named waterfall / falls / cascade → waterfall.\n"
  "5. Named lake / lagoon / reservoir → lake — never viewpoint, landmark, or "
  "waterfall. Put the access on attributes (hike, viewpoint) instead.\n"
  "6. Trail / scramble / climb as the visit → hike; add viewpoint or lake "
  "attributes when relevant.\n"
  "7. A place named as a national / state / regional park → park, even when the "
  "caption files it under viewpoints or beaches. A named beach or cove → beach, "
  "even when it sits inside a park and needs a walk to reach.\n"
  "8. Monument / statue / temple / citadel → landmark; add hike or viewpoint "
  "attributes when visitors also hike or look out.\n"
  "9. Viewpoint / waterfall / lake / beach reached on foot → include attribute "
  "hike.\n"
  "10. Never invent enum values.\n\n"
  "Allowed attributes by category:\n"
  f"{attribute_allowlist_prompt_lines()}"
)


@dataclass(frozen=True)
class ContentSnippet:
  """One piece of source text for place extraction (platform-agnostic)."""

  source: str
  text: str


@dataclass(frozen=True)
class ContentBundle:
  """Named content fields; converted to ContentSnippet list before extract."""

  caption: str
  hashtags: tuple[str, ...] = ()
  top_comments: tuple[str, ...] = ()
  location_tag: PlatformPlace | None = None
  transcript: str | None = None
  video_summary: str | None = None
  video_analysis: str | None = None
  image_text: str | None = None


ReelBundle = ContentBundle


@dataclass(frozen=True)
class ContentExtraction:
  places: tuple[ExtractedPlace, ...] = ()
  reel_summary: str | None = None


ReelExtraction = ContentExtraction

_SOURCE_HEADERS: dict[str, str] = {
  "caption": "CAPTION",
  "video_summary": "VIDEO SUMMARY",
  "transcript": "VIDEO TRANSCRIPT",
  "video_analysis": "VIDEO ANALYSIS",
  "image_text": "IMAGE TEXT",
  "location_tag": "LOCATION TAG",
  "hashtags": "HASHTAGS",
  "top_comments": "TOP COMMENTS",
}

_INLINE_SOURCES = frozenset({"location_tag", "hashtags"})


def snippets_from_bundle(bundle: ContentBundle) -> tuple[ContentSnippet, ...]:
  """Flatten a ContentBundle into ordered (source, text) snippets."""
  snippets: list[ContentSnippet] = []

  caption = bundle.caption.strip()
  if caption:
    snippets.append(ContentSnippet(source="caption", text=caption))

  video_summary = (bundle.video_summary or "").strip()
  if video_summary:
    snippets.append(ContentSnippet(source="video_summary", text=video_summary))

  transcript = (bundle.transcript or "").strip()
  if transcript:
    snippets.append(ContentSnippet(source="transcript", text=transcript))

  video_analysis = (bundle.video_analysis or "").strip()
  if video_analysis:
    snippets.append(ContentSnippet(source="video_analysis", text=video_analysis))

  image_text = (bundle.image_text or "").strip()
  if image_text:
    snippets.append(ContentSnippet(source="image_text", text=image_text))

  if bundle.location_tag is not None:
    location_parts = [bundle.location_tag.place_name]
    if bundle.location_tag.city:
      location_parts.append(bundle.location_tag.city)
    if bundle.location_tag.country:
      location_parts.append(bundle.location_tag.country)
    snippets.append(
      ContentSnippet(source="location_tag", text=", ".join(location_parts))
    )

  if bundle.hashtags:
    snippets.append(
      ContentSnippet(
        source="hashtags",
        text=" ".join(f"#{tag}" for tag in bundle.hashtags),
      )
    )

  if bundle.top_comments:
    comment_lines = "\n".join(f"- {comment}" for comment in bundle.top_comments)
    snippets.append(ContentSnippet(source="top_comments", text=comment_lines))

  return tuple(snippets)


def content_bundle_from_post(
  post: SavedPost,
  *,
  transcript: str | None = None,
  image_text: str | None = None,
  video_analysis: str | None = None,
) -> ContentBundle:
  """Build a ContentBundle from a SavedPost (any platform)."""
  return ContentBundle(
    caption=post.caption,
    hashtags=post.hashtags,
    top_comments=post.top_comments,
    location_tag=post.places[0] if post.places else None,
    transcript=transcript,
    image_text=image_text,
    video_analysis=video_analysis,
    video_summary=post.reel_summary,
  )


def _optional_str(value: Any) -> str | None:
  if value is None:
    return None
  text = str(value).strip()
  if not text or text.lower() in {"null", "none", "nil", "n/a", "na"}:
    return None
  return text


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
  if extracted.parent_category:
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
        parent_category=normalize_category(_optional_str(item.get("parent_category"))),
      )
    )

  return tuple(extracted)


def _parse_content_extraction(data: dict[str, Any] | None) -> ContentExtraction:
  if not data:
    return ContentExtraction()
  return ContentExtraction(
    places=_dedupe_by_name(_parse_extracted_places(data)),
    reel_summary=_optional_str(data.get("reel_summary")),
  )


_parse_reel_extraction = _parse_content_extraction


def format_content_snippets(snippets: Sequence[ContentSnippet]) -> str:
  """Render (source, text) snippets into the LLM user prompt."""
  sections: list[str] = []
  for snippet in snippets:
    text = snippet.text.strip()
    if not text:
      continue
    label = _SOURCE_HEADERS.get(
      snippet.source,
      snippet.source.replace("_", " ").upper(),
    )
    if snippet.source in _INLINE_SOURCES:
      sections.append(f"{label}: {text}")
    else:
      sections.append(f"{label}:\n{text}")
  return "\n\n".join(sections)


def format_content_bundle(bundle: ContentBundle) -> str:
  return format_content_snippets(snippets_from_bundle(bundle))


format_reel_bundle = format_content_bundle


def _create_completion(client: Any, content: str) -> Any | None:
  """Call OpenAI with deterministic settings, retrying transient failures.

  Returns None once retries are exhausted so a blip drops one post's extraction
  instead of raising through ingest.
  """
  from travelplanner import settings

  request: dict[str, Any] = {
    "model": settings.openai_model(),
    "messages": [
      {"role": "system", "content": REEL_EXTRACT_PROMPT},
      {"role": "user", "content": content},
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "extracted_places",
        "strict": True,
        "schema": PLACE_EXTRACT_SCHEMA,
      },
    },
    "temperature": settings.openai_temperature(),
  }

  attempt = 0
  while True:
    try:
      return client.chat.completions.create(**request)
    except Exception as exc:
      if "temperature" in request and "temperature" in str(exc).lower():
        # Reasoning models accept only the default temperature.
        request.pop("temperature")
        continue
      attempt += 1
      if attempt > _OPENAI_MAX_RETRIES:
        logger.exception("extract openai call failed after %d attempts", attempt)
        return None
      logger.warning(
        "extract openai call failed (attempt %d/%d), retrying: %s",
        attempt,
        _OPENAI_MAX_RETRIES,
        exc,
      )
      time.sleep(_OPENAI_RETRY_BACKOFF_SECONDS * attempt)


def fetch_places_from_snippets(
  snippets: Sequence[ContentSnippet],
) -> ContentExtraction:
  """Extract summary + places from a list of (source, text) snippets."""
  content = format_content_snippets(snippets).strip()
  if not content:
    logger.info("extract skipped: empty content snippets")
    return ContentExtraction()

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  client = get_client()
  if client is None:
    logger.warning("extract skipped: OPENAI_API_KEY not set")
    return ContentExtraction()

  sources = [snippet.source for snippet in snippets if snippet.text.strip()]
  logger.info(
    "extract start model=%s content_chars=%d sources=%s",
    settings.openai_model(),
    len(content),
    sources,
  )
  response = _create_completion(client, content)
  if response is None:
    return ContentExtraction()

  message_content = response.choices[0].message.content
  if not message_content:
    logger.warning("extract empty openai response")
    return ContentExtraction()

  try:
    data = json.loads(message_content)
  except (json.JSONDecodeError, TypeError):
    logger.exception("extract invalid json from openai")
    return ContentExtraction()

  result = _parse_content_extraction(data if isinstance(data, dict) else None)
  logger.info(
    "extract done places=%d has_summary=%s names=%s",
    len(result.places),
    bool(result.reel_summary),
    [place.place_name for place in result.places],
  )
  return result


def fetch_places_from_content(bundle: ContentBundle) -> ContentExtraction:
  """Extract places from a ContentBundle (convenience over snippets)."""
  return fetch_places_from_snippets(snippets_from_bundle(bundle))


fetch_places_from_reel = fetch_places_from_content


def fetch_places_from_text(text: str) -> tuple[ExtractedPlace, ...]:
  """Backward-compatible wrapper for caption-only extraction."""
  return fetch_places_from_snippets(
    (ContentSnippet(source="caption", text=text),)
  ).places
