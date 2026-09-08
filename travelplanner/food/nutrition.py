"""Pure recipe nutrition calculation.

The nutrition provider lives behind a small lookup callable so this module stays
independent of HTTP and can be reused with another food database later.
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

_GRAMS_BY_UNIT = {
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
}
_SERVINGS_PATTERN = re.compile(r"\d+(?:\.\d+)?")


def servings_from_recipe(recipe: ExtractedRecipe) -> float | None:
  """Return a stated numeric yield; do not guess a serving count."""
  if not recipe.servings:
    return None
  match = _SERVINGS_PATTERN.search(recipe.servings)
  if not match:
    return None
  servings = float(match.group())
  return servings if 0 < servings <= 100 else None


def ingredient_grams(amount: float | None, unit: str | None) -> float | None:
  if amount is None or amount <= 0 or not unit:
    return None
  multiplier = _GRAMS_BY_UNIT.get(unit.strip().casefold().rstrip("."))
  return amount * multiplier if multiplier is not None else None


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


def calculate_recipe_nutrition(recipe: ExtractedRecipe, lookup: NutritionLookup) -> RecipeNutrition | None:
  """Calculate nutrition only when every ingredient has a mass and a food match.

  Volume measures are deliberately skipped: translating cups or spoons to grams
  requires ingredient-specific density and guessing would make nutrition look more
  precise than it is.
  """
  servings = servings_from_recipe(recipe)
  if servings is None or not recipe.ingredients:
    return None

  total = NutritionMacros(0, 0, 0, 0)
  matched = 0
  sources: set[str] = set()
  for ingredient in recipe.ingredients:
    grams = ingredient_grams(ingredient.amount_numeric, ingredient.unit)
    profile = lookup(ingredient.name) if grams is not None else None
    if profile is None or grams is None:
      continue
    total = _add(total, _scale(profile.macros, grams / 100))
    matched += 1
    sources.add(profile.source)

  if matched == 0:
    return None
  return RecipeNutrition(
    recipe_total=total,
    per_serving=_scale(total, 1 / servings),
    servings=servings,
    matched_ingredient_count=matched,
    ingredient_count=len(recipe.ingredients),
    is_complete=matched == len(recipe.ingredients),
    source=", ".join(sorted(sources)),
  )
