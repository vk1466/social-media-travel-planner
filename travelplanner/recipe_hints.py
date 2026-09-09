"""Recipe data extracted from a social post.

These are primarily source-bound hints. A clearly necessary cooking default may
be included only when ``estimated_inferred`` is true.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NutritionMacros:
  """Nutrition amounts in grams, except calories which are kilocalories."""

  calories_kcal: float
  protein_g: float
  carbohydrates_g: float
  fat_g: float
  fiber_g: float = 0.0
  sugar_g: float = 0.0
  sodium_mg: float = 0.0


@dataclass(frozen=True)
class RecipeNutrition:
  """Estimated nutrition calculated from measured recipe ingredients."""

  recipe_total: NutritionMacros
  per_serving: NutritionMacros
  servings: float
  matched_ingredient_count: int
  ingredient_count: int
  is_complete: bool
  source: str
  servings_inferred: bool = False
  matched_ingredients: tuple[str, ...] = ()
  unmatched_ingredients: tuple[str, ...] = ()
  macro_highlights: tuple[str, ...] = ()
  dietary_fit: tuple[str, ...] = ()


@dataclass(frozen=True)
class RecipeIngredient:
  name: str
  amount: str | None = None
  amount_numeric: float | None = None
  unit: str | None = None
  note: str | None = None
  aisle: str | None = None
  group: str | None = None
  estimated_grams: float | None = None


@dataclass(frozen=True)
class ExtractedRecipe:
  title: str | None = None
  summary: str | None = None
  ingredients: tuple[RecipeIngredient, ...] = ()
  steps: tuple[str, ...] = ()
  servings: str | None = None
  prep_time_minutes: int | None = None
  cook_time_minutes: int | None = None
  tags: tuple[str, ...] = ()
  cuisine: str | None = None
  meal_type: str | None = None
  difficulty: str | None = None
  estimated_inferred: bool = False
  tips: tuple[str, ...] = ()
  equipment: tuple[str, ...] = ()
  dietary: tuple[str, ...] = ()
  step_timers_seconds: tuple[int | None, ...] = ()
  nutrition: RecipeNutrition | None = None
  image_url: str | None = None
