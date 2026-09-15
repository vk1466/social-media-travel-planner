"""Browserless + LLM adapter for trail facts and AllTrails canonical URL lookup."""

from __future__ import annotations

import json
import logging
from typing import Any

from travelplanner import settings
from travelplanner.clients import browserless
from travelplanner.clients.openai import get_client
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso

logger = logging.getLogger(__name__)

TOOL_ID = "trail_search"
SOURCE_NAME = "alltrails"


def fetch_trail_details(query: FactQuery) -> list[SourceDocument]:
  """Searches Google for the trail via Browserless and extracts structured trail facts with LLM."""
  if not browserless.api_key():
    return []

  region_parts = [query.city, query.state_province, query.country]
  region = " ".join([p for p in region_parts if p])

  search_term = f'site:alltrails.com/trail/ "{query.display_name}"'
  if region:
    search_term += f" {region}"

  logger.info("trail_search query=%s place_id=%s", search_term, query.place_id)
  candidates = browserless.search_trail_candidates(search_term)
  if not candidates:
    html = browserless.search_google_for_trail(search_term)
    if html:
      candidates = browserless.extract_alltrails_candidates(html)
  if not candidates:
    return []

  openai_client = get_client()
  if not openai_client:
    # If no OpenAI client, fallback to first candidate URL
    top = candidates[0]
    return [
      SourceDocument(
        tool_id=TOOL_ID,
        source_name=SOURCE_NAME,
        source_ref=top["url"],
        title=top.get("title") or query.display_name,
        latitude=query.latitude,
        longitude=query.longitude,
        content={"website": top["url"]},
        retrieved_at=utc_now_iso(),
      )
    ]

  system_prompt = (
    "You are an expert at identifying outdoor hiking trails and extracting accurate trail specifications.\n"
    "Given candidate search results for an AllTrails search, identify the exact matching trail page "
    "and extract its verified trail metrics.\n"
    "Be precise: convert distances to kilometers (e.g. 3.2 mi -> 5.15 km) and elevation gain to meters (e.g. 650 ft -> 198 m).\n"
    "Allowed difficulty: 'easy', 'moderate', 'hard', or null. If the snippet/title characterizes the hike as easy, moderate, or hard/strenuous, infer it.\n"
    "Allowed route_type: 'out_and_back', 'loop', 'point_to_point', or null."
  )

  user_prompt = (
    f"Target Place: {query.display_name}\n"
    f"Region: {region or 'Unknown'}\n"
    f"Pin: {query.latitude},{query.longitude}\n\n"
    f"Candidates from AllTrails Search:\n"
    f"{json.dumps(candidates, indent=2)}\n\n"
    "Return JSON with keys:\n"
    "- canonical_url: string (the exact matching alltrails.com/trail/... URL, or null if no candidate matches this trail)\n"
    "- distance_km: float or null\n"
    "- elevation_gain_m: int or null\n"
    "- difficulty: 'easy' | 'moderate' | 'hard' | null\n"
    "- route_type: 'out_and_back' | 'loop' | 'point_to_point' | null\n"
    "- rating: float (e.g. 4.8) or null\n"
    "- reviews_count: int or null\n"
    "- summary: string or null (concise 1-sentence description)"
  )

  try:
    response = openai_client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
      ],
      response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content or "{}"
    parsed: dict[str, Any] = json.loads(raw)
  except Exception as exc:
    logger.warning("trail_search LLM resolution failed: %s", exc)
    parsed = {}

  canonical_url = parsed.get("canonical_url") or candidates[0]["url"]
  if not canonical_url or "alltrails.com/trail/" not in canonical_url:
    return []

  content: dict[str, Any] = {
    "website": canonical_url,
    "distance_km": parsed.get("distance_km"),
    "elevation_gain_m": parsed.get("elevation_gain_m"),
    "difficulty": parsed.get("difficulty"),
    "route_type": parsed.get("route_type"),
    "rating": parsed.get("rating"),
    "reviews_count": parsed.get("reviews_count"),
    "description": parsed.get("summary") or candidates[0].get("title"),
  }

  return [
    SourceDocument(
      tool_id=TOOL_ID,
      source_name=SOURCE_NAME,
      source_ref=canonical_url,
      title=candidates[0].get("title") or query.display_name,
      latitude=query.latitude,
      longitude=query.longitude,
      content=content,
      retrieved_at=utc_now_iso(),
    )
  ]
