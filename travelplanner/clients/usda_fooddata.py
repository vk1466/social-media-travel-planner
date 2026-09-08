"""Small fail-soft client for USDA FoodData Central food search."""

from __future__ import annotations

import json
import logging
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import certifi

from travelplanner import settings
from travelplanner.food.nutrition import FoodNutritionProfile
from travelplanner.recipe_hints import NutritionMacros

logger = logging.getLogger(__name__)
_API_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search"
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def food_data_api_key() -> str | None:
  return settings.usda_fooddata_api_key()


def _nutrient_amounts(food: dict[str, Any]) -> dict[str, float]:
  values: dict[str, float] = {}
  for nutrient in food.get("foodNutrients", []):
    if not isinstance(nutrient, dict):
      continue
    name = str(nutrient.get("nutrientName") or nutrient.get("name") or "").casefold()
    amount = nutrient.get("value") if "value" in nutrient else nutrient.get("amount")
    if isinstance(amount, (int, float)) and not isinstance(amount, bool):
      values[name] = float(amount)
  return values


def _amount(values: dict[str, float], *names: str) -> float:
  return next((values[name] for name in names if name in values), 0.0)


def search_food(ingredient_name: str) -> FoodNutritionProfile | None:
  """Return the first USDA search match's per-100g nutrients, or ``None``."""
  key = food_data_api_key()
  if not key or not ingredient_name.strip():
    return None
  query = urllib.parse.urlencode({"query": ingredient_name.strip(), "api_key": key, "pageSize": 1})
  request = urllib.request.Request(f"{_API_BASE}?{query}", headers={"User-Agent": "social-media-travel-planner"})
  try:
    with urllib.request.urlopen(request, timeout=10, context=_SSL_CONTEXT) as response:
      payload = json.loads(response.read().decode("utf-8"))
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
    logger.warning("USDA food lookup failed ingredient=%s error=%s", ingredient_name, exc)
    return None
  foods = payload.get("foods") if isinstance(payload, dict) else None
  if not isinstance(foods, list) or not foods or not isinstance(foods[0], dict):
    return None
  values = _nutrient_amounts(foods[0])
  return FoodNutritionProfile(NutritionMacros(
    calories_kcal=_amount(values, "energy", "energy (atwater general factors)"),
    protein_g=_amount(values, "protein"),
    carbohydrates_g=_amount(values, "carbohydrate, by difference"),
    fat_g=_amount(values, "total lipid (fat)"),
    fiber_g=_amount(values, "fiber, total dietary"),
    sugar_g=_amount(values, "sugars, total including nlea", "sugars, total"),
    sodium_mg=_amount(values, "sodium, na"),
  ))
