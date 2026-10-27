from __future__ import annotations

import json
import logging
import re
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

PLACE_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "title": {
      "type": ["string", "null"],
      "description": (
        "Clean, concise English headline/title for this post (<= 60 chars, no emoji, no hashtags, never cut mid-word). "
        "Captures the destination, theme, or guide topic (e.g. '10 Best Places to Visit in Tokyo' or 'Hidden Waterfalls in Oregon')."
      ),
    },
    "reel_summary": {
      "type": ["string", "null"],
      "description": (
        "2-3 sentence traveler-facing summary of what this reel is about and why "
        "someone would go. Neutral and concrete — not marketing hype. Null if the "
        "reel has no usable travel content"
      ),
    },
    "trip_tips": {
      "type": "array",
      "items": {"type": "string"},
      "description": (
        "Concrete trip-level recommendations and macro travel advice grounded in the sources that apply "
        "to the broader itinerary or destination area: suggested trip duration or day-by-day pacing, "
        "best season/months/time to visit, rental car/transport logistics, passes/tickets to book early, "
        "budget advice, or packing/gear tips. Empty array when none"
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
              "One short visit-useful sentence unique to this source: how to "
              "experience the place, when, what to skip, or a pairing. Null if the "
              "source only restates identity or fame (iconic, must-see, symbol of), "
              "or only describes what the camera showed. Never invent facts"
            ),
          },
          "tips": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
              "ALL concrete tips, facts, and advice mentioned in the reel video, transcript, "
              "caption, or slide images that apply to this place: timings, distances, costs, "
              "admission fees, booking rules, must-do activities, what to order/try, gear/footwear advice, "
              "parking/permits, seasonal or photography tips. Extract every useful fact mentioned. "
              "Empty array only when the sources give none. Never invent generic advice"
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
  "required": ["reel_summary", "places", "trip_tips"],
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
  "8. Named restaurants, cafes, bars, and markets to visit are places — including "
  "local food-guide and review reels, in any language. Names often appear only "
  "in VIDEO TRANSCRIPT or on-screen text, not the caption. Skip home cooking "
  "with no visitable venue.\n"
  "9. Deduplicate the same place across sources into one entry; merge details and "
  "tips. Clean place_name — no emoji, day labels, or access-route suffixes.\n\n"
  "Also write reel_summary: 2-3 short sentences for a traveler (what/where and why "
  "go). Concrete and neutral — no hype, hashtags, or emojis. If VIDEO SUMMARY is "
  "provided, refine it using caption facts; do not invent stops. Null only if "
  "there is no usable travel content.\n\n"
  "Trip-level tips (trip_tips):\n"
  "- trip_tips: copy every macro travel recommendation or itinerary tip from the "
  "sources (suggested trip length/day pacing, best season/months/time to visit, "
  "transit/car rental logistics, passes/permits to buy in advance, budget or packing advice). "
  "Use [] if none.\n\n"
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
  "- details: one short visit-useful sentence unique to this source "
  "(how to enjoy it, when, what to skip, a pairing). Null if the source only "
  "calls it iconic / a must-see / a symbol of the city, or only describes "
  "what the video showed. Do not write brochure identity copy.\n"
  "- tips: capture every concrete fact, tip, and practical guidance stated for that place "
  "across the video, audio transcript, caption, and slide images (distances, duration, "
  "operating schedule/timings, admission/costs, booking rules, permits, parking, roadside stops, "
  "seasonal advisories, photography lighting, required gear or footwear). For restaurants, cafes, "
  "and food venues, capture signature dishes, what to order, and dietary notes. "
  "Use [] only if none are mentioned.\n"
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


Snippet = ContentSnippet


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
  author_handle: str | None = None
  tagged_users: tuple[dict[str, Any], ...] = ()


ReelBundle = ContentBundle


@dataclass(frozen=True)
class ContentExtraction:
  places: tuple[ExtractedPlace, ...] = ()
  reel_summary: str | None = None
  trip_tips: tuple[str, ...] = ()
  title: str | None = None


ReelExtraction = ContentExtraction

_SOURCE_HEADERS: dict[str, str] = {
  "author_handle": "AUTHOR",
  "caption": "CAPTION",
  "video_summary": "VIDEO SUMMARY",
  "transcript": "VIDEO TRANSCRIPT",
  "video_analysis": "VIDEO ANALYSIS",
  "image_text": "IMAGE TEXT",
  "location_tag": "LOCATION TAG",
  "hashtags": "HASHTAGS",
  "top_comments": "TOP COMMENTS",
  "mentioned_account": "MENTIONED ACCOUNT / TAGGED USER",
}

_INLINE_SOURCES = frozenset({"author_handle", "location_tag", "hashtags", "mentioned_account"})


def resolve_handle_to_place_candidate(
  handle: str,
  profile_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
  """Resolve an @handle into business name, category, and address/bio."""
  clean_handle = handle.strip().lstrip("@")
  if profile_data:
    name = (
      profile_data.get("full_name")
      or profile_data.get("name")
      or clean_handle.replace("_", " ").replace(".", " ").title()
    )
    return {
      "handle": clean_handle,
      "place_name": name,
      "category": profile_data.get("category") or profile_data.get("category_name") or "business",
      "address": profile_data.get("address") or profile_data.get("city") or "",
      "bio": profile_data.get("biography") or profile_data.get("bio") or "",
    }
  human_name = clean_handle.replace("_", " ").replace(".", " ").title()
  return {
    "handle": clean_handle,
    "place_name": human_name,
    "category": "venue",
    "address": "",
    "bio": "",
  }


def snippets_from_bundle(bundle: ContentBundle) -> tuple[ContentSnippet, ...]:
  """Flatten a ContentBundle into ordered (source, text) snippets."""
  snippets: list[ContentSnippet] = []

  if bundle.author_handle:
    author = bundle.author_handle.strip()
    if author:
      handle = f"@{author}" if not author.startswith("@") else author
      snippets.append(ContentSnippet(source="author_handle", text=handle))

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

  # Tagged users and caption @mentions
  tagged_by_handle: dict[str, dict[str, Any]] = {}
  for tag in bundle.tagged_users:
    uname = str(tag.get("username") or "").strip().lstrip("@").lower()
    if uname:
      tagged_by_handle[uname] = tag

  caption_mentions = re.findall(r"@([A-Za-z0-9._]{1,30})", bundle.caption)
  author_handle_clean = (bundle.author_handle or "").strip().lstrip("@").lower()

  all_handles: list[str] = list(tagged_by_handle.keys())
  for m in caption_mentions:
    m_clean = m.strip().lstrip("@").lower()
    if m_clean and m_clean not in all_handles and m_clean != author_handle_clean:
      all_handles.append(m_clean)

  for handle in all_handles:
    profile = tagged_by_handle.get(handle)
    resolved = resolve_handle_to_place_candidate(handle, profile)
    parts: list[str] = [f"@{handle}"]
    if resolved.get("place_name"):
      parts.append(f"Name: {resolved['place_name']}")
    if resolved.get("category"):
      parts.append(f"Category: {resolved['category']}")
    if resolved.get("address"):
      parts.append(f"Address/City: {resolved['address']}")
    if resolved.get("bio"):
      parts.append(f"Bio: {resolved['bio']}")
    snippets.append(ContentSnippet(source="mentioned_account", text=" | ".join(parts)))

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
    author_handle=post.author_handle,
    top_comments=post.top_comments,
    location_tag=post.places[0] if post.places else None,
    transcript=transcript,
    image_text=image_text,
    video_analysis=video_analysis,
    video_summary=post.reel_summary,
    tagged_users=getattr(post, "tagged_users", ()),
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


def content_extraction_from_payload(data: dict[str, Any] | None) -> ContentExtraction:
  """Parse a place-extraction JSON object. Empty when the payload is missing."""
  return _parse_content_extraction(data)


def truncate_at_word_boundary(text: str, max_length: int = 60) -> str:
  text = (text or "").strip()
  if not text or len(text) <= max_length:
    return text
  sub = text[: max_length - 1]
  last_space = sub.rfind(" ")
  if last_space > int(max_length * 0.4):
    return f"{sub[:last_space].rstrip()}…"
  return f"{sub.rstrip()}…"


def generate_clean_title(
  caption: str | None,
  summary: str | None = None,
  places: Sequence[ExtractedPlace] = (),
  max_length: int = 60,
) -> str:
  """Derive a clean, concise English title (<= max_length) without cutting mid-word."""
  cap = (caption or "").strip()
  if cap:
    first_line = cap.split("\n")[0].strip()
    cleaned = re.sub(r"[#@][A-Za-z0-9_.]+", "", first_line)
    # Strip emojis and pictographs
    cleaned = re.sub(r"[\U00010000-\U0010ffff]", "", cleaned)
    cleaned = re.sub(r"[\u2600-\u27bf]", "", cleaned)
    cleaned = re.sub(r"\s*\([^)]*\)", "", cleaned)  # remove parenthetical like (for first timers)
    cleaned = re.sub(r"^(here\s+(is|are)\s+(our|my|a)\s+)", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip(". !?:-")
    # Clean up mixed shouting like "10 AMAZING things to do in TOKYO, Japan"
    if any(w.isupper() and len(w) > 2 for w in cleaned.split()):
      cleaned = cleaned.title()
    elif cleaned.islower():
      cleaned = cleaned.capitalize()
    if 8 <= len(cleaned) <= max_length:
      return cleaned
    elif len(cleaned) > max_length:
      return truncate_at_word_boundary(cleaned, max_length)

  if summary and summary.strip():
    cleaned_summary = summary.strip()
    # Skip meta sentences like "This reel showcases..."
    cleaned_summary = re.sub(
      r"^(this|the)\s+(reel|video|post)\s+(showcases|highlights|features|explores|takes|shows)\s+",
      "",
      cleaned_summary,
      flags=re.IGNORECASE,
    )
    first_sentence = re.split(r"[.!?]\s+", cleaned_summary)[0].strip()
    if 10 <= len(first_sentence) <= max_length:
      return first_sentence
    if len(cleaned_summary) > max_length:
      return truncate_at_word_boundary(cleaned_summary, max_length)
    if cleaned_summary:
      return cleaned_summary

  if places:
    cities = [p.city for p in places if p.city]
    if cities:
      from collections import Counter

      common_city = Counter(cities).most_common(1)[0][0]
      if len(places) > 1:
        candidate = f"{len(places)} Best Places in {common_city}"
        if len(candidate) <= max_length:
          return candidate
      else:
        candidate = f"Visiting {places[0].place_name} in {common_city}"
        if len(candidate) <= max_length:
          return candidate
    elif len(places) == 1:
      candidate = f"Guide to {places[0].place_name}"
      if len(candidate) <= max_length:
        return candidate
    elif len(places) > 1:
      candidate = f"Exploring {places[0].place_name} and More"
      if len(candidate) <= max_length:
        return candidate

  if not cap:
    return "Saved reel"

  return truncate_at_word_boundary(first_line, max_length)


def _parse_content_extraction(data: dict[str, Any] | None) -> ContentExtraction:
  if not data:
    return ContentExtraction()
  raw_tips = data.get("trip_tips", [])
  trip_tips: tuple[str, ...] = ()
  if isinstance(raw_tips, list):
    trip_tips = tuple(
      tip
      for tip in (_optional_str(value) for value in raw_tips)
      if tip is not None
    )
  raw_title = _optional_str(data.get("title"))
  clean_title = truncate_at_word_boundary(raw_title, 60) if raw_title else None
  return ContentExtraction(
    places=_dedupe_by_name(_parse_extracted_places(data)),
    reel_summary=_optional_str(data.get("reel_summary")),
    trip_tips=trip_tips,
    title=clean_title,
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
  """Call OpenAI for place extraction. None once retries are exhausted."""
  from travelplanner.clients.openai import create_json_completion

  return create_json_completion(
    client,
    system_prompt=REEL_EXTRACT_PROMPT,
    user_content=content,
    schema_name="extracted_places",
    schema=PLACE_EXTRACT_SCHEMA,
    log_label="extract",
  )


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
