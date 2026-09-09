"""Pure recipe nutrition calculation with comprehensive culinary conversions.

Supports mass units, volume conversions with culinary density heuristics,
common staple count estimates, and explicit LLM estimated grams.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

from travelplanner.recipe_hints import ExtractedRecipe, NutritionMacros, RecipeNutrition


@dataclass(frozen=True)
class FoodNutritionProfile:
  """Nutrient amounts for 100 grams of one food database match."""

  macros: NutritionMacros
  source: str = "USDA FoodData Central"


NutritionLookup = Callable[[str], FoodNutritionProfile | None]

_MASS_BY_UNIT: dict[str, float] = {
  "g": 1.0,
  "gram": 1.0,
  "grams": 1.0,
  "kg": 1000.0,
  "kilogram": 1000.0,
  "kilograms": 1000.0,
  "oz": 28.349523125,
  "ounce": 28.349523125,
  "ounces": 28.349523125,
  "lb": 453.59237,
  "lbs": 453.59237,
  "pound": 453.59237,
  "pounds": 453.59237,
  "mg": 0.001,
  "milligram": 0.001,
  "milligrams": 0.001,
}

_ML_BY_UNIT: dict[str, float] = {
  "ml": 1.0,
  "milliliter": 1.0,
  "milliliters": 1.0,
  "l": 1000.0,
  "liter": 1000.0,
  "liters": 1000.0,
  "tsp": 4.92892,
  "teaspoon": 4.92892,
  "teaspoons": 4.92892,
  "tbsp": 14.7868,
  "tablespoon": 14.7868,
  "tablespoons": 14.7868,
  "tbs": 14.7868,
  "tb": 14.7868,
  "cup": 236.588,
  "cups": 236.588,
  "c": 236.588,
  "fl oz": 29.5735,
  "fluid ounce": 29.5735,
  "fluid ounces": 29.5735,
  "pint": 473.176,
  "pints": 473.176,
  "pt": 473.176,
  "quart": 946.353,
  "quarts": 946.353,
  "qt": 946.353,
  "gallon": 3785.41,
  "gallons": 3785.41,
  "gal": 3785.41,
  "pinch": 0.5,
  "pinches": 0.5,
  "dash": 0.5,
  "dashes": 0.5,
}

_COUNT_UNITS: dict[str, float] = {
  "clove": 3.0,
  "cloves": 3.0,
  "egg": 50.0,
  "eggs": 50.0,
  "slice": 28.0,
  "slices": 28.0,
  "can": 400.0,
  "cans": 400.0,
  "stalk": 40.0,
  "stalks": 40.0,
  "rib": 40.0,
  "ribs": 40.0,
  "head": 500.0,
  "heads": 500.0,
  "bunch": 100.0,
  "bunches": 100.0,
  "stick": 113.0,
  "sticks": 113.0,
}

_STAPLE_WEIGHTS: dict[str, float] = {
  "garlic": 3.0,
  "egg": 50.0,
  "onion": 150.0,
  "avocado": 150.0,
  "potato": 170.0,
  "banana": 118.0,
  "apple": 180.0,
  "lemon": 58.0,
  "lime": 44.0,
  "tomato": 125.0,
  "carrot": 60.0,
  "bell pepper": 120.0,
  "cucumber": 200.0,
  "zucchini": 200.0,
}

_SERVINGS_PATTERN = re.compile(r"\d+(?:\.\d+)?")


def _density_g_per_ml(name: str | None) -> float:
  """Approximate culinary density in grams per milliliter."""
  if not name:
    return 1.0
  n = name.casefold()
  if any(w in n for w in ("flour", "cornstarch", "cocoa")):
    return 0.53
  if any(w in n for w in ("powdered sugar", "icing sugar")):
    return 0.51
  if "brown sugar" in n:
    return 0.93
  if any(w in n for w in ("sugar", "syrup", "honey", "molasses")):
    return 0.85
  if any(w in n for w in ("oat", "oats", "cereal")):
    return 0.38
  if any(w in n for w in ("rice", "quinoa", "lentil", "lentils")):
    return 0.78
  if any(w in n for w in ("oil", "butter", "ghee", "lard", "shortening", "margarine")):
    return 0.92
  if any(w in n for w in ("spinach", "kale", "lettuce", "arugula", "cilantro", "parsley", "basil")):
    return 0.25
  if any(w in n for w in ("cheese", "parmesan", "cheddar", "mozzarella")):
    return 0.45
  return 1.0


def servings_from_recipe(recipe: ExtractedRecipe, fallback_default: bool = True) -> tuple[float, bool] | None:
  """Return stated numeric yield or a sensible fallback; returns (servings, is_inferred)."""
  if recipe.servings:
    match = _SERVINGS_PATTERN.search(recipe.servings)
    if match:
      servings = float(match.group())
      if 0 < servings <= 100:
        return servings, False

  if not fallback_default:
    return None

  # Fallback yield estimation based on meal type or single-serving markers
  single_serving_types = ("breakfast", "snack", "cocktail", "drink", "dessert")
  if recipe.meal_type and recipe.meal_type.casefold() in single_serving_types:
    return 1.0, True

  for tag in recipe.tags:
    t = tag.casefold()
    if "single" in t or "smoothie" in t or "mug" in t:
      return 1.0, True

  # Conservative default home meal yield
  return 2.0, True


def ingredient_grams(
  amount: float | None,
  unit: str | None,
  ingredient_name: str | None = None,
  estimated_grams: float | None = None,
) -> float | None:
  """Convert ingredient amount and unit into grams."""
  if estimated_grams is not None and estimated_grams > 0:
    return float(estimated_grams)

  if amount is None or amount <= 0:
    return None

  cleaned_unit = unit.strip().casefold().rstrip(".") if unit else ""

  # 1. Mass units (direct multiplier)
  if cleaned_unit in _MASS_BY_UNIT:
    return amount * _MASS_BY_UNIT[cleaned_unit]

  # 2. Volume units (scaled by culinary density)
  if cleaned_unit in _ML_BY_UNIT:
    density = _density_g_per_ml(ingredient_name)
    return amount * _ML_BY_UNIT[cleaned_unit] * density

  # 3. Known count units (e.g. 4 cloves, 2 slices, 1 can)
  if cleaned_unit in _COUNT_UNITS:
    return amount * _COUNT_UNITS[cleaned_unit]

  # 4. Count unit without explicit unit or generic count terms
  generic_counts = ("", "count", "piece", "pieces", "whole", "item", "items", "large", "medium", "small")
  if cleaned_unit in generic_counts and ingredient_name:
    n = ingredient_name.casefold()
    for staple, weight in _STAPLE_WEIGHTS.items():
      if staple in n:
        return amount * weight

  return None


def _add(left: NutritionMacros, right: NutritionMacros) -> NutritionMacros:
  return NutritionMacros(
    calories_kcal=left.calories_kcal + right.calories_kcal,
    protein_g=left.protein_g + right.protein_g,
    carbohydrates_g=left.carbohydrates_g + right.carbohydrates_g,
    fat_g=left.fat_g + right.fat_g,
    fiber_g=left.fiber_g + right.fiber_g,
    sugar_g=left.sugar_g + right.sugar_g,
    sodium_mg=left.sodium_mg + right.sodium_mg,
  )


def _scale(macros: NutritionMacros, factor: float) -> NutritionMacros:
  return NutritionMacros(
    calories_kcal=macros.calories_kcal * factor,
    protein_g=macros.protein_g * factor,
    carbohydrates_g=macros.carbohydrates_g * factor,
    fat_g=macros.fat_g * factor,
    fiber_g=macros.fiber_g * factor,
    sugar_g=macros.sugar_g * factor,
    sodium_mg=macros.sodium_mg * factor,
  )


def calculate_recipe_nutrition(
  recipe: ExtractedRecipe,
  lookup: NutritionLookup,
  allow_inferred_servings: bool = True,
  use_ai_fallback: bool = True,
) -> RecipeNutrition | None:
  """Calculate recipe macros across measured ingredients, volume measures, and counts.

  If USDA database coverage is low (< 75%) or misses key ingredients, falls back
  to the AI Nutritionist for 100% complete culinary estimation.
  """
  servings_info = servings_from_recipe(recipe, fallback_default=allow_inferred_servings)
  if servings_info is None or not recipe.ingredients:
    return None

  servings, servings_inferred = servings_info

  total = NutritionMacros(0, 0, 0, 0)
  matched_ingredients: list[str] = []
  unmatched_ingredients: list[str] = []
  sources: set[str] = set()

  for ingredient in recipe.ingredients:
    grams = ingredient_grams(
      amount=ingredient.amount_numeric,
      unit=ingredient.unit,
      ingredient_name=ingredient.name,
      estimated_grams=ingredient.estimated_grams,
    )
    profile = lookup(ingredient.name) if grams is not None else None
    if profile is None or grams is None:
      unmatched_ingredients.append(ingredient.name)
      continue

    total = _add(total, _scale(profile.macros, grams / 100.0))
    matched_ingredients.append(ingredient.name)
    sources.add(profile.source)

  coverage = len(matched_ingredients) / len(recipe.ingredients) if recipe.ingredients else 0.0

  # When database coverage is incomplete (< 75%), use AI Nutritionist for complete macros
  if use_ai_fallback and (coverage < 0.75 or not matched_ingredients):
    from travelplanner.food.ai_nutrition import estimate_recipe_nutrition_ai
    ai_result = estimate_recipe_nutrition_ai(recipe)
    if ai_result is not None:
      return ai_result

  if not matched_ingredients:
    return None

  return RecipeNutrition(
    recipe_total=total,
    per_serving=_scale(total, 1.0 / servings),
    servings=servings,
    matched_ingredient_count=len(matched_ingredients),
    ingredient_count=len(recipe.ingredients),
    is_complete=len(matched_ingredients) == len(recipe.ingredients),
    source=", ".join(sorted(sources)),
    servings_inferred=servings_inferred,
    matched_ingredients=tuple(matched_ingredients),
    unmatched_ingredients=tuple(unmatched_ingredients),
  )


def recalculate_all_recipe_nutrition(
  lookup: NutritionLookup | None = None,
  use_ai_fallback: bool = True,
) -> dict[str, int]:
  """Recalculate nutrition and macros for all saved posts that have recipes."""
  from dataclasses import replace
  from travelplanner import store
  from travelplanner.clients.usda_fooddata import search_food

  nutrition_lookup = lookup or search_food
  posts = store.load_all_posts()
  food_posts = [p for p in posts if p.extracted_recipe is not None]
  updated = 0
  for post in food_posts:
    recipe = post.extracted_recipe
    assert recipe is not None
    nutrition = calculate_recipe_nutrition(recipe, nutrition_lookup, use_ai_fallback=use_ai_fallback)
    if nutrition is not None:
      updated_post = replace(post, extracted_recipe=replace(recipe, nutrition=nutrition))
      store.save_post(updated_post)
      updated += 1

  return {"total_food_posts": len(food_posts), "updated": updated}
