"""Extract hairstyle names, styling products, and maintenance tips from content snippets."""

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

HAIRSTYLE_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "style_name": {"type": "string", "description": "Specific cut or style name, e.g. Textured French Crop Fade"},
    "hair_type": {"type": ["string", "null"], "description": "straight, wavy, curly, coily, thick, fine"},
    "attributes": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Attributes like low taper, textured fringe, layered, curtain bangs",
    },
    "products": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Styling products mentioned (clay, pomade, sea salt spray, leave-in)",
    },
    "maintenance_tips": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Drying tips, styling advice, trim cadence",
    },
  },
  "required": ["style_name", "attributes", "products", "maintenance_tips"],
  "additionalProperties": False,
}

HAIRSTYLE_PROMPT = (
  "Extract haircut and hairstyle details from this post.\n"
  "Identify the specific style/cut name, hair type, key attributes (fade, layers, fringe), "
  "recommended styling products, and tips for maintaining or styling the look.\n"
  "Ground strictly in the provided caption, transcript, and OCR text."
)


def extract_hairstyle_from_snippets(snippets: tuple) -> dict[str, Any]:
  text = format_content_snippets(snippets)
  if not text.strip():
    return {
      "style_name": "Hair Inspiration",
      "hair_type": None,
      "attributes": [],
      "products": [],
      "maintenance_tips": [],
    }

  client = openai.get_client()
  if not client:
    return _heuristic_hairstyle_extract(text)

  try:
    response = client.chat.completions.create(
      model="gpt-4o-mini",
      messages=[
        {"role": "system", "content": HAIRSTYLE_PROMPT},
        {"role": "user", "content": text},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "hairstyle_extraction",
          "schema": HAIRSTYLE_EXTRACT_SCHEMA,
          "strict": True,
        },
      },
      temperature=0.1,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)
  except Exception as exc:
    logger.warning("hairstyle LLM extraction failed: %s; using heuristic", exc)
    return _heuristic_hairstyle_extract(text)


def _heuristic_hairstyle_extract(text: str) -> dict[str, Any]:
  attrs: list[str] = []
  products: list[str] = []
  tips: list[str] = []

  style_keywords = ["fade", "taper", "crop", "buzz cut", "curls", "fringe", "bob", "layers", "undercut", "balayage", "blowout"]
  found_styles = [kw for kw in style_keywords if re.search(rf"\b{kw}\b", text, re.IGNORECASE)]
  style_name = " ".join(found_styles).title() if found_styles else "Modern Haircut"

  prod_keywords = ["pomade", "clay", "sea salt spray", "matte paste", "oil", "shampoo", "gel", "wax", "mousse"]
  products = [kw.title() for kw in prod_keywords if re.search(rf"\b{kw}\b", text, re.IGNORECASE)]

  return {
    "style_name": style_name,
    "hair_type": None,
    "attributes": found_styles,
    "products": products,
    "maintenance_tips": ["Style damp with product and air or blow dry."],
  }


def extract_hairstyle(ctx: IngestContext) -> IngestContext:
  bundle = ctx.content_bundle
  if bundle is None:
    if ctx.post is None:
      logger.warning("extract_hairstyle skipped: no post")
      return ctx
    bundle = content_bundle_from_post(
      ctx.post,
      transcript=ctx.transcript,
      image_text=ctx.image_text,
    )
    ctx.content_bundle = bundle

  data = extract_hairstyle_from_snippets(snippets_from_bundle(bundle))
  if ctx.post is not None:
    updates: dict[str, Any] = {"extracted_hair": data}
    if not ctx.post.title:
      name = data.get("style_name") or "Hair Styling Guide"
      updates["title"] = truncate_at_word_boundary(f"Hair: {name}", 60)
    ctx.post = replace(ctx.post, **updates)
  logger.info("extract_hairstyle done style=%s", data.get("style_name"))
  return ctx


EXTRACT_HAIRSTYLE_STEP = Step(
  name="extract_hairstyle",
  run=extract_hairstyle,
  retry_attempts=1,
)
