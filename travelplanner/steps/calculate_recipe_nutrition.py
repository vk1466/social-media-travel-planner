"""Calculate food recipe macros after recipe quantities have been normalized."""

from __future__ import annotations

from dataclasses import replace

from travelplanner.clients.usda_fooddata import search_food
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.food.nutrition import calculate_recipe_nutrition


def calculate_recipe_nutrition_step(ctx: IngestContext) -> IngestContext:
  if not FeatureFlag.get("recipe_nutrition") or not ctx.post or not ctx.post.extracted_recipe:
    return ctx
  recipe = ctx.post.extracted_recipe
  nutrition = calculate_recipe_nutrition(recipe, search_food)
  if nutrition is not None:
    ctx.post = replace(ctx.post, extracted_recipe=replace(recipe, nutrition=nutrition))
  return ctx


CALCULATE_RECIPE_NUTRITION_STEP = Step(
  name="calculate_recipe_nutrition",
  run=calculate_recipe_nutrition_step,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
