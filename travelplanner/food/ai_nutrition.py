"""AI-powered culinary nutrition and dietary insights estimation."""

from __future__ import annotations

import json
import logging
from typing import Any

from travelplanner import settings
from travelplanner.clients.openai import get_client
from travelplanner.recipe_hints import ExtractedRecipe, NutritionMacros, RecipeNutrition

logger = logging.getLogger(__name__)

NUTRITION_AI_SCHEMA: dict[str, Any] = {
  "type": "object",
  "properties": {
    "servings": {"type": "number", "description": "Realistic number of servings (e.g. 1.0, 2.0, 4.0)"},
    "servings_inferred": {"type": "boolean", "description": "True if servings had to be estimated"},
    "per_serving": {
      "type": "object",
      "properties": {
        "calories_kcal": {"type": "number"},
        "protein_g": {"type": "number"},
        "carbohydrates_g": {"type": "number"},
        "fat_g": {"type": "number"},
        "fiber_g": {"type": "number"},
        "sugar_g": {"type": "number"},
        "sodium_mg": {"type": "number"},
      },
      "required": ["calories_kcal", "protein_g", "carbohydrates_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"],
      "additionalProperties": False,
    },
    "recipe_total": {
      "type": "object",
      "properties": {
        "calories_kcal": {"type": "number"},
        "protein_g": {"type": "number"},
        "carbohydrates_g": {"type": "number"},
        "fat_g": {"type": "number"},
        "fiber_g": {"type": "number"},
        "sugar_g": {"type": "number"},
        "sodium_mg": {"type": "number"},
      },
      "required": ["calories_kcal", "protein_g", "carbohydrates_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"],
      "additionalProperties": False,
    },
    "macro_highlights": {
      "type": "array",
      "items": {"type": "string"},
      "description": "2-3 short impactful nutritional highlights, e.g. ['High Protein (32g)', 'High Fiber (8g)', 'Low Calorie']",
    },
    "dietary_fit": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Applicable dietary attributes, e.g. ['Vegetarian', 'Gluten-Free', 'High-Protein']",
    },
  },
  "required": [
    "servings",
    "servings_inferred",
    "per_serving",
    "recipe_total",
    "macro_highlights",
    "dietary_fit",
  ],
  "additionalProperties": False,
}

NUTRITION_AI_SYSTEM_PROMPT = """You are an expert registered dietitian and culinary food scientist.
Analyze the provided home cooking recipe (title, ingredients, instructions, cuisine, servings).
Accurately calculate the complete nutritional profile and macros for the ENTIRE recipe and PER SERVING.

Guidelines:
1. Account for EVERY ingredient, including cooking fats, pan greasing, seasonings, and unmeasured items
   ('salt to taste', 'oil for brushing', 'butter for toasting', 'water as needed') with sensible culinary defaults.
2. For regional or ethnic ingredients (e.g. paneer, sooji/rava, curd, moong dal, chana, curry leaves, tortillas, ghee),
   use accurate, authentic nutritional composition data.
3. If servings is unspecified or unclear, determine a realistic yield (e.g. single portion 1 vs family meal 2 or 4)
   and set servings_inferred=true.
4. Verify mathematical consistency:
   - recipe_total = per_serving * servings
   - calories ~= 4 * protein_g + 4 * carbohydrates_g + 9 * fat_g (+/- 5%)
5. Provide concise macro_highlights (e.g. 'High Protein (28g)', 'Rich in Fiber (8g)', 'Under 300 kcal')
   and dietary_fit tags (e.g. 'Vegetarian', 'Gluten-Free', 'High-Protein')."""


def _format_recipe_for_prompt(recipe: ExtractedRecipe) -> str:
  lines: list[str] = [
    f"Recipe Title: {recipe.title or 'Untitled Recipe'}",
  ]
  if recipe.summary:
    lines.append(f"Summary: {recipe.summary}")
  if recipe.cuisine:
    lines.append(f"Cuisine: {recipe.cuisine}")
  if recipe.meal_type:
    lines.append(f"Meal Type: {recipe.meal_type}")
  if recipe.servings:
    lines.append(f"Stated Servings: {recipe.servings}")

  lines.append("\nIngredients:")
  for ing in recipe.ingredients:
    parts = [p for p in [ing.amount, ing.unit, ing.name] if p]
    note = f" ({ing.note})" if ing.note else ""
    lines.append(f"- {' '.join(parts)}{note}")

  if recipe.steps:
    lines.append("\nInstructions:")
    for idx, step in enumerate(recipe.steps, 1):
      lines.append(f"{idx}. {step}")

  return "\n".join(lines)


def estimate_recipe_nutrition_ai(recipe: ExtractedRecipe) -> RecipeNutrition | None:
  """Estimate comprehensive recipe nutrition using LLM culinary reasoning."""
  client = get_client()
  if not client or not recipe.ingredients:
    return None

  prompt = _format_recipe_for_prompt(recipe)

  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0.0,
      messages=[
        {"role": "system", "content": NUTRITION_AI_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "recipe_nutrition_estimate",
          "schema": NUTRITION_AI_SCHEMA,
        },
      },
    )
    content = response.choices[0].message.content
    if not content:
      return None
    data = json.loads(content)
  except Exception as exc:
    logger.warning("AI nutrition estimation failed recipe=%s error=%s", recipe.title, exc)
    return None

  if not isinstance(data, dict):
    return None

  def parse_macros(vals: dict[str, Any]) -> NutritionMacros:
    return NutritionMacros(
      calories_kcal=max(0.0, float(vals.get("calories_kcal", 0))),
      protein_g=max(0.0, float(vals.get("protein_g", 0))),
      carbohydrates_g=max(0.0, float(vals.get("carbohydrates_g", 0))),
      fat_g=max(0.0, float(vals.get("fat_g", 0))),
      fiber_g=max(0.0, float(vals.get("fiber_g", 0))),
      sugar_g=max(0.0, float(vals.get("sugar_g", 0))),
      sodium_mg=max(0.0, float(vals.get("sodium_mg", 0))),
    )

  servings = float(data.get("servings", 1.0))
  servings_inferred = bool(data.get("servings_inferred", False))
  per_serving = parse_macros(data.get("per_serving", {}))
  recipe_total = parse_macros(data.get("recipe_total", {}))

  macro_highlights = tuple(str(h) for h in data.get("macro_highlights", []) if isinstance(h, str))
  dietary_fit = tuple(str(d) for d in data.get("dietary_fit", []) if isinstance(d, str))
  all_ingredient_names = tuple(ing.name for ing in recipe.ingredients)

  return RecipeNutrition(
    recipe_total=recipe_total,
    per_serving=per_serving,
    servings=servings,
    matched_ingredient_count=len(recipe.ingredients),
    ingredient_count=len(recipe.ingredients),
    is_complete=True,
    source="AI Nutritionist",
    servings_inferred=servings_inferred,
    matched_ingredients=all_ingredient_names,
    unmatched_ingredients=(),
    macro_highlights=macro_highlights,
    dietary_fit=dietary_fit,
  )
