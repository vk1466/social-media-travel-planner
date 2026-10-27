"""Extract fashion items, aesthetics, and brands from content snippets."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import replace
from typing import Any

from travelplanner.clients import openai
from travelplanner.extract import (
  content_bundle_from_post,
  format_content_snippets,
  snippets_from_bundle,
  truncate_at_word_boundary,
)
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)

FASHION_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "aesthetic": {"type": "string", "description": "Overall style or aesthetic, e.g. Minimalist Streetwear"},
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string", "description": "Specific clothing/accessory item"},
          "brand": {"type": ["string", "null"], "description": "Brand or designer name if mentioned"},
          "category": {"type": "string", "description": "top, bottom, footwear, outerwear, accessory"},
          "color": {"type": ["string", "null"]},
        },
        "required": ["name", "category"],
        "additionalProperties": False,
      },
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"},
    },
  },
  "required": ["aesthetic", "items"],
  "additionalProperties": False,
}

FASHION_PROMPT = (
  "Extract fashion, clothing, and styling details from this post.\n"
  "Identify all specific clothing items, shoes, accessories, brands, and the overall aesthetic.\n"
  "Ground strictly in the provided text, frame OCR, and captions. Do not invent unmentioned brands."
)


def extract_fashion_from_snippets(snippets: tuple) -> dict[str, Any]:
  text = format_content_snippets(snippets)
  if not text.strip():
    return {"aesthetic": "Fashion & Styling", "items": [], "tags": []}

  client = openai.get_client()
  if not client:
    return _heuristic_fashion_extract(text)

  try:
    response = client.chat.completions.create(
      model="gpt-4o-mini",
      messages=[
        {"role": "system", "content": FASHION_PROMPT},
        {"role": "user", "content": text},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "fashion_extraction",
          "schema": FASHION_EXTRACT_SCHEMA,
          "strict": True,
        },
      },
      temperature=0.1,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)
  except Exception as exc:
    logger.warning("fashion LLM extraction failed: %s; using heuristic", exc)
    return _heuristic_fashion_extract(text)


def _heuristic_fashion_extract(text: str) -> dict[str, Any]:
  items: list[dict[str, Any]] = []
  words = text.split()
  # Look for common clothing keywords
  keywords = ["jacket", "coat", "dress", "pants", "jeans", "boots", "sneakers", "skirt", "sweater", "hoodie", "bag", "hat"]
  for kw in keywords:
    match = re.search(rf"\b([a-zA-Z]+\s+{kw}|{kw})\b", text, re.IGNORECASE)
    if match:
      items.append({
        "name": match.group(0).title(),
        "category": kw,
        "brand": None,
        "color": None,
      })
  return {
    "aesthetic": "Streetwear & Outfit Inspo",
    "items": items,
    "tags": ["outfit", "style"],
  }


def extract_fashion(ctx: IngestContext) -> IngestContext:
  bundle = ctx.content_bundle
  if bundle is None:
    if ctx.post is None:
      logger.warning("extract_fashion skipped: no post")
      return ctx
    bundle = content_bundle_from_post(
      ctx.post,
      transcript=ctx.transcript,
      image_text=ctx.image_text,
    )
    ctx.content_bundle = bundle

  data = extract_fashion_from_snippets(snippets_from_bundle(bundle))
  if ctx.post is not None:
    updates: dict[str, Any] = {"extracted_fashion": data}
    if not ctx.post.title:
      aesthetic = data.get("aesthetic") or "Fashion Inspiration"
      updates["title"] = truncate_at_word_boundary(f"Style: {aesthetic}", 60)
    ctx.post = replace(ctx.post, **updates)
  logger.info("extract_fashion done items=%d", len(data.get("items", [])))
  return ctx


EXTRACT_FASHION_STEP = Step(
  name="extract_fashion",
  run=extract_fashion,
  retry_attempts=1,
)
