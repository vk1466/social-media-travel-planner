"""LLM pass: deduce famous-for, highlights, caveats, and recommendations."""

from __future__ import annotations

import json
import logging
from typing import Any

from travelplanner.models import Place, PlaceFacts
from travelplanner.places.facts.config.fields import INTERPRETIVE_FIELDS
from travelplanner.places.facts.pipeline.schema import build_insights_schema
from travelplanner.places.facts.types import SourceDocument

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are given documents already retrieved for one specific place, plus
structured facts already copied from those sources (hours, phone, website).
Deduce only interpretive fields: what the place is famous for, best time to
visit, typical duration, highlights (good), caveats (bad / watch-outs), and
practical recommendations.
Every filled field must cite the source_ref it came from. If the documents do
not support a field, leave it null (or an empty list). Never invent hours,
fees, phone numbers, or cuisine. Never use prior knowledge.
Do not copy reel tips verbatim unless the retrieved documents also state them.
"""


def _format_documents(documents: list[SourceDocument]) -> str:
  blocks: list[str] = []
  for index, document in enumerate(documents):
    content_json = json.dumps(document.content, ensure_ascii=False, sort_keys=True)
    blocks.append(
      f"[{index}] source_name={document.source_name} "
      f"source_ref={document.source_ref}\n"
      f"title={document.title}\n"
      f"lat={document.latitude} lon={document.longitude}\n"
      f"content={content_json}"
    )
  return "\n\n".join(blocks)


def _format_static_facts(facts: PlaceFacts | None) -> str:
  if facts is None:
    return "(none)"
  rows = [
    f"website_url={facts.website_url}",
    f"phone_number={facts.phone_number}",
    f"opening_hours_text={list(facts.opening_hours_text)}",
    f"admission_text={facts.admission_text}",
    f"cuisines={list(facts.cuisines)}",
    f"price_level={facts.price_level}",
    f"reservation_required={facts.reservation_required}",
  ]
  return "\n".join(rows)


def fill_insights_from_documents(
  place: Place,
  documents: list[SourceDocument],
  *,
  static_facts: PlaceFacts | None = None,
) -> tuple[dict[str, Any] | None, str]:
  """Ask the LLM for interpretive facts. Returns (draft_or_none, note)."""
  if not documents:
    return None, "llm_insights skipped: no documents"

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  if not settings.openai_api_key():
    return None, "llm_insights skipped: OPENAI_API_KEY not set"

  client = get_client()
  if client is None:
    return None, "llm_insights skipped: OPENAI_API_KEY not set"

  schema = build_insights_schema()
  user_content = (
    f"place_id: {place.place_id}\n"
    f"display_name: {place.display_name}\n"
    f"category: {place.category or 'unknown'}\n"
    f"aliases: {', '.join(place.aliases) or '(none)'}\n"
    f"pin: {place.location.latitude},{place.location.longitude}\n"
    f"country: {place.location.country or '(unknown)'}\n"
    f"reel_tips: {'; '.join(place.tips) or '(none)'}\n"
    f"fields_to_fill: {', '.join(sorted(INTERPRETIVE_FIELDS))}\n\n"
    "Structured facts already stored (do not redo these):\n"
    f"{_format_static_facts(static_facts)}\n\n"
    "Documents:\n"
    f"{_format_documents(documents)}\n\n"
    "Return JSON for the interpretive fields plus evidence and notes."
  )

  logger.info(
    "llm_insights start place_id=%s category=%s docs=%d",
    place.place_id,
    place.category,
    len(documents),
  )

  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "place_facts_insights",
          "strict": True,
          "schema": schema,
        },
      },
    )
  except Exception as exc:
    logger.warning("llm_insights openai error place_id=%s error=%s", place.place_id, exc)
    return None, f"llm_insights error: {exc}"

  content = response.choices[0].message.content if response.choices else None
  if not content:
    return None, "llm_insights error: empty response"

  try:
    data = json.loads(content)
  except json.JSONDecodeError:
    return None, "llm_insights error: invalid JSON"

  if not isinstance(data, dict):
    return None, "llm_insights error: response is not an object"

  logger.info("llm_insights ok place_id=%s", place.place_id)
  return data, "llm_insights ok"


def fill_facts_from_documents(
  place: Place,
  documents: list[SourceDocument],
) -> tuple[dict[str, Any] | None, str]:
  """Back-compat alias for the insights pass (no static facts overlay)."""
  return fill_insights_from_documents(place, documents)
