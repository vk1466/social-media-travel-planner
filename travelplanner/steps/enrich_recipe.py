"""Post-process and enrich ExtractedRecipe with step timers and numeric quantities."""

from __future__ import annotations

import logging
import re
from dataclasses import replace
from fractions import Fraction

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.recipe_hints import ExtractedRecipe, RecipeIngredient

logger = logging.getLogger(__name__)

# Matches "15 minutes", "1.5 hours", "30-40 min", "45 mins", "1 hr", "90 seconds"
_TIMER_PATTERN = re.compile(
  r"\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(?:\d+(?:\.\d+)?)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b",
  re.IGNORECASE,
)


def _parse_step_timer(step_text: str) -> int | None:
  match = _TIMER_PATTERN.search(step_text)
  if not match:
    return None
  val_str = match.group(1)
  unit_str = match.group(2).lower()
  try:
    val = float(val_str)
  except ValueError:
    return None

  if "h" in unit_str:
    seconds = int(val * 3600)
  elif "m" in unit_str:
    seconds = int(val * 60)
  else:
    seconds = int(val)

  return seconds if 0 < seconds <= 86400 else None


def _parse_fraction_str(amount_str: str | None) -> float | None:
  if not amount_str:
    return None
  cleaned = amount_str.strip()
  # Handle "1 1/2"
  parts = cleaned.split()
  try:
    if len(parts) == 2:
      return float(float(parts[0]) + float(Fraction(parts[1])))
    if len(parts) == 1:
      # "1/2" or "2" or "2.5"
      if "/" in parts[0]:
        return float(Fraction(parts[0]))
      return float(parts[0])
  except Exception:
    return None
  return None


def enrich_recipe(ctx: IngestContext) -> IngestContext:
  """Enrich recipe with fallback parsed step timers and numeric ingredient amounts."""
  if not ctx.post or not ctx.post.extracted_recipe:
    return ctx

  recipe = ctx.post.extracted_recipe

  # 1. Enrich ingredient amount_numeric if missing
  new_ingredients: list[RecipeIngredient] = []
  for ing in recipe.ingredients:
    if ing.amount_numeric is None and ing.amount:
      numeric = _parse_fraction_str(ing.amount)
      if numeric is not None:
        ing = replace(ing, amount_numeric=numeric)
    new_ingredients.append(ing)

  # 2. Enrich step timers if missing
  new_timers: list[int | None] = []
  existing_timers = list(recipe.step_timers_seconds)
  while len(existing_timers) < len(recipe.steps):
    existing_timers.append(None)

  for idx, step_text in enumerate(recipe.steps):
    timer = existing_timers[idx]
    if timer is None:
      timer = _parse_step_timer(step_text)
    new_timers.append(timer)

  enriched = replace(
    recipe,
    ingredients=tuple(new_ingredients),
    step_timers_seconds=tuple(new_timers),
  )
  ctx.post = replace(ctx.post, extracted_recipe=enriched)
  return ctx


ENRICH_RECIPE_STEP = Step(
  name="enrich_recipe",
  run=enrich_recipe,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
