"""Fetch external blog recipe JSON-LD if linked in post caption."""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any
from urllib.parse import urlparse

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step

logger = logging.getLogger(__name__)

_URL_PATTERN = re.compile(r"https?://[^\s<>\"')]+", re.IGNORECASE)
_IGNORED_DOMAINS = {
  "instagram.com",
  "www.instagram.com",
  "instagr.am",
  "tiktok.com",
  "www.tiktok.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "threads.net",
  "facebook.com",
  "twitter.com",
  "x.com",
}
_TIMEOUT_SECONDS = 5.0
_MAX_BYTES = 250_000


def _find_external_recipe_urls(text: str) -> list[str]:
  urls: list[str] = []
  for match in _URL_PATTERN.finditer(text):
    raw_url = match.group(0).rstrip(".,;!?:")
    try:
      parsed = urlparse(raw_url)
      domain = (parsed.hostname or "").lower()
      if domain and domain not in _IGNORED_DOMAINS and "." in domain:
        urls.append(raw_url)
    except Exception:
      continue
  return urls


def _extract_recipe_from_json_ld(data: Any) -> dict[str, Any] | None:
  if isinstance(data, list):
    for item in data:
      if res := _extract_recipe_from_json_ld(item):
        return res
    return None

  if not isinstance(data, dict):
    return None

  if "@graph" in data and isinstance(data["@graph"], list):
    return _extract_recipe_from_json_ld(data["@graph"])

  type_val = data.get("@type")
  is_recipe = False
  if isinstance(type_val, str) and type_val.lower() == "recipe":
    is_recipe = True
  elif isinstance(type_val, list) and any(str(t).lower() == "recipe" for t in type_val):
    is_recipe = True

  if is_recipe:
    return data
  return None


def _clean_instruction(step: Any) -> str | None:
  if isinstance(step, str) and step.strip():
    return step.strip()
  if isinstance(step, dict):
    text = step.get("text") or step.get("name")
    if isinstance(text, str) and text.strip():
      return text.strip()
  return None


def _format_schema_recipe(recipe: dict[str, Any]) -> str:
  parts: list[str] = []
  name = recipe.get("name")
  if isinstance(name, str) and name.strip():
    parts.append(f"Recipe Title: {name.strip()}")

  description = recipe.get("description")
  if isinstance(description, str) and description.strip():
    parts.append(f"Summary: {description.strip()}")

  ingredients = recipe.get("recipeIngredient")
  if isinstance(ingredients, list) and ingredients:
    ing_lines = [f"- {str(i).strip()}" for i in ingredients if str(i).strip()]
    if ing_lines:
      parts.append("Ingredients:\n" + "\n".join(ing_lines))

  instructions = recipe.get("recipeInstructions")
  if isinstance(instructions, list) and instructions:
    step_lines: list[str] = []
    for idx, item in enumerate(instructions, 1):
      cleaned = _clean_instruction(item)
      if cleaned:
        step_lines.append(f"{idx}. {cleaned}")
    if step_lines:
      parts.append("Instructions:\n" + "\n".join(step_lines))
  elif isinstance(instructions, str) and instructions.strip():
    parts.append(f"Instructions:\n{instructions.strip()}")

  for key, label in (
    ("prepTime", "Prep Time"),
    ("cookTime", "Cook Time"),
    ("totalTime", "Total Time"),
    ("recipeYield", "Yield"),
    ("recipeCuisine", "Cuisine"),
    ("recipeCategory", "Category"),
  ):
    val = recipe.get(key)
    if val:
      parts.append(f"{label}: {val}")

  return "\n\n".join(parts)


def fetch_recipe_schema_org(url: str) -> str | None:
  """Fetch a webpage and parse schema.org/Recipe JSON-LD into text."""
  req = urllib.request.Request(
    url,
    headers={"User-Agent": "Mozilla/5.0 (compatible; TravelPlanner/1.0; +https://antigravity.google.com)"},
  )
  try:
    with urllib.request.urlopen(req, timeout=_TIMEOUT_SECONDS) as resp:
      content_type = resp.headers.get("Content-Type", "")
      if "text/html" not in content_type and "application/xhtml" not in content_type:
        return None
      html_bytes = resp.read(_MAX_BYTES)
      html = html_bytes.decode("utf-8", errors="replace")
  except Exception as exc:
    logger.debug("recipe url fetch failed url=%s: %s", url, exc)
    return None

  pattern = re.compile(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE)
  for match in pattern.finditer(html):
    raw_json = match.group(1).strip()
    if not raw_json:
      continue
    try:
      parsed = json.loads(raw_json)
      recipe = _extract_recipe_from_json_ld(parsed)
      if recipe:
        return _format_schema_recipe(recipe)
    except Exception:
      continue
  return None


def fetch_recipe_source(ctx: IngestContext) -> IngestContext:
  """Inspect caption for external recipe URLs; fetch and attach JSON-LD recipe if found."""
  if not ctx.post or not ctx.post.caption:
    return ctx

  urls = _find_external_recipe_urls(ctx.post.caption)
  if not urls:
    return ctx

  for url in urls[:2]:
    text = fetch_recipe_schema_org(url)
    if text:
      logger.info("fetch_recipe_source found schema.org recipe from url=%s", url)
      if ctx.image_text:
        ctx.image_text = f"{ctx.image_text}\n\n[Web Recipe Source:\n{text}]"
      else:
        ctx.image_text = f"[Web Recipe Source:\n{text}]"
      break
  return ctx


FETCH_RECIPE_SOURCE_STEP = Step(
  name="fetch_recipe_source",
  run=fetch_recipe_source,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
