"""Recipe data extracted from a social post.

These are primarily source-bound hints. A clearly necessary cooking default may
be included only when ``estimated_inferred`` is true.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RecipeIngredient:
  name: str
  amount: str | None = None
  amount_numeric: float | None = None
  unit: str | None = None
  note: str | None = None
  aisle: str | None = None
  group: str | None = None


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
