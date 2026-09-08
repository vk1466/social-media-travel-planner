from __future__ import annotations

import json
import logging
from dataclasses import replace
from typing import TYPE_CHECKING, Any, Sequence

from travelplanner.extract import (
  ContentSnippet,
  content_bundle_from_post,
  format_content_snippets,
  snippets_from_bundle,
)
from travelplanner.recipe_hints import ExtractedRecipe, RecipeIngredient

if TYPE_CHECKING:
  from travelplanner.models import SavedPost

logger = logging.getLogger(__name__)

RECIPE_EXTRACT_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "title": {"type": ["string", "null"]},
    "summary": {"type": ["string", "null"]},
    "ingredients": {"type": "array", "items": {"type": "object", "properties": {
      "name": {"type": "string"},
      "amount": {"type": ["string", "null"]},
      "amount_numeric": {"type": ["number", "null"]},
      "unit": {"type": ["string", "null"]},
      "note": {"type": ["string", "null"]},
      "aisle": {"type": ["string", "null"], "enum": ["Produce", "Dairy & Refrigerated", "Meat & Seafood", "Pantry & Spices", "Bakery", "Other", None]},
      "group": {"type": ["string", "null"]},
    }, "required": ["name", "amount", "amount_numeric", "unit", "note", "aisle", "group"], "additionalProperties": False}},
    "steps": {"type": "array", "items": {"type": "string"}},
    "step_timers_seconds": {"type": "array", "items": {"type": ["integer", "null"]}},
    "servings": {"type": ["string", "null"]},
    "prep_time_minutes": {"type": ["integer", "null"]},
    "cook_time_minutes": {"type": ["integer", "null"]},
    "tags": {"type": "array", "items": {"type": "string"}},
    "cuisine": {"type": ["string", "null"]},
    "meal_type": {"type": ["string", "null"], "enum": ["breakfast", "lunch", "dinner", "dessert", "cocktail", "snack", None]},
    "difficulty": {"type": ["string", "null"], "enum": ["easy", "medium", "hard", None]},
    "equipment": {"type": "array", "items": {"type": "string"}},
    "dietary": {"type": "array", "items": {"type": "string"}},
    "estimated_inferred": {"type": "boolean"},
    "tips": {"type": "array", "items": {"type": "string"}},
  },
  "required": [
    "title", "summary", "ingredients", "steps", "step_timers_seconds", "servings",
    "prep_time_minutes", "cook_time_minutes", "tags", "cuisine", "meal_type",
    "difficulty", "equipment", "dietary", "estimated_inferred", "tips",
  ],
  "additionalProperties": False,
}

RECIPE_EXTRACT_PROMPT = """Extract a recipe idea from this food social post.
Use facts explicitly present in the supplied caption, transcript, on-screen text,
video analysis, hashtags, or comments. Extract stated ingredients with standard
units where compatible (g, ml, tbsp, tsp, cups, pieces), assign a grocery aisle,
identify ingredient component groups (e.g., 'Sauce', 'Marinade', 'Dough', 'Main')
when multiple components exist, and provide amount_numeric (e.g. 0.5, 2.0) when
the quantity can be parsed.

Formulate clear, ordered, source-grounded steps. For each step, if a specific cooking,
baking, or resting duration is stated (e.g. 'simmer for 15 minutes' or 'bake 30 min'),
provide the corresponding duration in seconds in step_timers_seconds (e.g. 900 or 1800),
or null if the step has no specific timer. Keep length of step_timers_seconds matching
the number of steps.

Extract required kitchen equipment (e.g. Blender, Cast iron skillet, Air fryer)
and applicable dietary attributes (e.g. vegetarian, vegan, gluten_free, dairy_free).

If one basic cooking detail is clearly necessary but absent (for example an
obvious conventional oven temperature or a short simmer time), you may provide
one conservative estimate. Set estimated_inferred=true whenever an estimate is
included. Never represent estimates as creator-provided. Leave unclear fields
null: partial is better than fabrication. Keep cuisine, meal_type, difficulty,
tags, and tips source-grounded. This is home cooking; do not extract restaurants
or travel places."""


def _text(value: Any) -> str | None:
  return value.strip() or None if isinstance(value, str) else None


def _minutes(value: Any) -> int | None:
  return value if isinstance(value, int) and not isinstance(value, bool) and 0 < value <= 1440 else None


def _number(value: Any) -> float | None:
  if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0:
    return float(value)
  return None


def _parse_extracted_recipe(data: dict[str, Any] | None) -> ExtractedRecipe | None:
  if not isinstance(data, dict):
    return None
  ingredients: list[RecipeIngredient] = []
  for item in data.get("ingredients", []):
    if not isinstance(item, dict) or not (name := _text(item.get("name"))):
      continue
    ingredients.append(
      RecipeIngredient(
        name=name,
        amount=_text(item.get("amount")),
        amount_numeric=_number(item.get("amount_numeric")),
        unit=_text(item.get("unit")),
        note=_text(item.get("note")),
        aisle=_text(item.get("aisle")),
        group=_text(item.get("group")),
      )
    )
  steps = tuple(text for item in data.get("steps", []) if (text := _text(item)))
  step_timers: list[int | None] = []
  raw_timers = data.get("step_timers_seconds")
  if isinstance(raw_timers, list) and raw_timers:
    for val in raw_timers:
      if isinstance(val, int) and not isinstance(val, bool) and 0 < val <= 86400:
        step_timers.append(val)
      else:
        step_timers.append(None)
    if len(step_timers) < len(steps):
      step_timers.extend([None] * (len(steps) - len(step_timers)))
    elif len(step_timers) > len(steps):
      step_timers = step_timers[:len(steps)]
    final_timers = tuple(step_timers) if any(t is not None for t in step_timers) else ()
  else:
    final_timers = ()

  tags = tuple(dict.fromkeys(text for item in data.get("tags", []) if (text := _text(item))))
  equipment = tuple(dict.fromkeys(text for item in data.get("equipment", []) if (text := _text(item))))
  dietary = tuple(dict.fromkeys(text for item in data.get("dietary", []) if (text := _text(item))))
  recipe = ExtractedRecipe(
    title=_text(data.get("title")),
    summary=_text(data.get("summary")),
    ingredients=tuple(ingredients),
    steps=steps,
    servings=_text(data.get("servings")),
    prep_time_minutes=_minutes(data.get("prep_time_minutes")),
    cook_time_minutes=_minutes(data.get("cook_time_minutes")),
    tags=tags,
    cuisine=_text(data.get("cuisine")),
    meal_type=_text(data.get("meal_type")),
    difficulty=_text(data.get("difficulty")),
    estimated_inferred=data.get("estimated_inferred") is True,
    tips=tuple(text for item in data.get("tips", []) if (text := _text(item))),
    equipment=equipment,
    dietary=dietary,
    step_timers_seconds=final_timers,
  )
  return recipe if any((recipe.title, recipe.summary, recipe.ingredients, recipe.steps)) else None


def fetch_recipe_from_snippets(snippets: Sequence[ContentSnippet]) -> ExtractedRecipe | None:
  content = format_content_snippets(snippets).strip()
  if not content:
    return None
  from travelplanner.clients.openai import get_client
  from travelplanner import settings
  client = get_client()
  if client is None:
    logger.warning("recipe extract skipped: OPENAI_API_KEY not set")
    return None
  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      messages=[{"role": "system", "content": RECIPE_EXTRACT_PROMPT}, {"role": "user", "content": content}],
      response_format={"type": "json_schema", "json_schema": {"name": "extracted_recipe", "strict": True, "schema": RECIPE_EXTRACT_SCHEMA}},
      temperature=settings.openai_temperature(),
    )
    message = response.choices[0].message.content
    return _parse_extracted_recipe(json.loads(message)) if message else None
  except Exception:
    logger.exception("recipe extract failed")
    return None

RECIPE_RECONSTRUCT_PROMPT = """You are a master culinary chef and recipe developer.
The user saved a food social post or cooking reel where the creator demonstrated a dish
but omitted detailed ingredient measurements or step-by-step instructions in the text/audio.
Your task is to reconstruct a complete, practical, authentic home-cooking recipe for this dish.

Instructions:
1. Ground your recipe in whatever dish name, cuisine, ingredients, or cooking methods are
   hinted at in the post's title, caption, hashtags, or summary.
2. Provide a full list of ingredients with standard measurements (g, ml, tbsp, tsp, cups,
   pieces, pinch) and assign each to an appropriate grocery aisle (Produce, Dairy & Refrigerated,
   Meat & Seafood, Pantry & Spices, Bakery, Other). Group components (e.g. 'Sauce', 'Marinade',
   'Main') if helpful.
3. Formulate clear, ordered, actionable step-by-step cooking instructions. For steps with
   a cooking, baking, or resting duration, specify the duration in seconds in step_timers_seconds.
4. Estimate prep time, cook time, difficulty, kitchen equipment, and dietary tags.
5. Provide 1-3 helpful chef tips or substitutions.
6. Always set estimated_inferred=true to clearly indicate this recipe was completed by Chef AI."""


def reconstruct_recipe_for_post(post: Any) -> ExtractedRecipe | None:
  """Reconstruct a complete home recipe when a food post omitted full measurements or steps."""
  context_parts: list[str] = []
  if getattr(post, "extracted_recipe", None) and post.extracted_recipe.title:
    context_parts.append(f"Dish Title: {post.extracted_recipe.title}")
  if getattr(post, "reel_summary", None):
    context_parts.append(f"Video Summary: {post.reel_summary}")
  if getattr(post, "caption", None):
    context_parts.append(f"Post Caption: {post.caption}")
  if getattr(post, "hashtags", None):
    context_parts.append(f"Hashtags: {' '.join(post.hashtags)}")
  if getattr(post, "top_comments", None):
    context_parts.append(f"Top Comments: {' | '.join(post.top_comments[:3])}")
  if getattr(post, "extracted_recipe", None):
    er = post.extracted_recipe
    if er.summary:
      context_parts.append(f"Recipe Summary: {er.summary}")
    if er.cuisine:
      context_parts.append(f"Cuisine: {er.cuisine}")
    if er.ingredients:
      context_parts.append(f"Partial ingredients noted: {', '.join(ing.name for ing in er.ingredients)}")

  content = "\n\n".join(context_parts).strip()
  if not content:
    return None

  from travelplanner.clients.openai import get_client
  from travelplanner import settings
  client = get_client()
  if client is None:
    logger.warning("recipe reconstruct skipped: OPENAI_API_KEY not set")
    return None
  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      messages=[{"role": "system", "content": RECIPE_RECONSTRUCT_PROMPT}, {"role": "user", "content": content}],
      response_format={"type": "json_schema", "json_schema": {"name": "extracted_recipe", "strict": True, "schema": RECIPE_EXTRACT_SCHEMA}},
      temperature=settings.openai_temperature(),
    )
    message = response.choices[0].message.content
    if not message:
      return None
    data = json.loads(message)
    if isinstance(data, dict):
      data["estimated_inferred"] = True
    return _parse_extracted_recipe(data)
  except Exception:
    logger.exception("recipe reconstruct failed")
    return None

