"""One LLM call to fill category-scoped facts from retrieved documents."""

from __future__ import annotations

import json
import logging
from typing import Any

from travelplanner.models import Place
from travelplanner.places.facts.categories import policy_for_category
from travelplanner.places.facts.schema import build_fill_schema
from travelplanner.places.facts.types import SourceDocument

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are given documents already retrieved for one specific place. Fill only
fields these documents support. Every filled field must cite the
source_ref it came from. If the documents describe a different place, or
do not mention a field, leave it null (or an empty list for list fields).
Never use prior knowledge. Never guess hours, fees, or cuisine.
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


def fill_facts_from_documents(
  place: Place,
  documents: list[SourceDocument],
) -> tuple[dict[str, Any] | None, str]:
  """Ask the LLM to fill facts. Returns (draft_or_none, note). Never raises."""
  if not documents:
    return None, "llm_fill skipped: no documents"

  from travelplanner import settings
  from travelplanner.clients.openai import get_client

  if not settings.openai_api_key():
    return None, "llm_fill skipped: OPENAI_API_KEY not set"

  client = get_client()
  if client is None:
    return None, "llm_fill skipped: OPENAI_API_KEY not set"

  policy = policy_for_category(place.category)
  schema = build_fill_schema(place.category)
  user_content = (
    f"place_id: {place.place_id}\n"
    f"display_name: {place.display_name}\n"
    f"category: {place.category or 'unknown'}\n"
    f"aliases: {', '.join(place.aliases) or '(none)'}\n"
    f"pin: {place.location.latitude},{place.location.longitude}\n"
    f"country: {place.location.country or '(unknown)'}\n"
    f"fields_to_fill: {', '.join(sorted(policy.all_fields))}\n\n"
    "Documents:\n"
    f"{_format_documents(documents)}\n\n"
    "Return JSON for the requested fields plus evidence and notes."
  )

  logger.info(
    "llm_fill start place_id=%s category=%s docs=%d fields=%d",
    place.place_id,
    place.category,
    len(documents),
    len(policy.all_fields),
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
          "name": "place_facts_fill",
          "strict": True,
          "schema": schema,
        },
      },
    )
  except Exception as exc:
    logger.warning("llm_fill openai error place_id=%s error=%s", place.place_id, exc)
    return None, f"llm_fill error: {exc}"

  content = response.choices[0].message.content if response.choices else None
  if not content:
    return None, "llm_fill error: empty response"

  try:
    data = json.loads(content)
  except json.JSONDecodeError:
    return None, "llm_fill error: invalid JSON"

  if not isinstance(data, dict):
    return None, "llm_fill error: response is not an object"

  logger.info("llm_fill ok place_id=%s", place.place_id)
  return data, "llm_fill ok"
