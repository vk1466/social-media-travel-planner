"""Robust client for USDA FoodData Central food search.

Prioritizes Foundation, SR Legacy, and Survey (FNDDS) standard reference foods
over Branded items, extracts verified KCAL amounts without kJ overwriting,
and normalizes queries using ingredient cleaning heuristics.
"""

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
from travelplanner.food.ingredient_cleaner import clean_ingredient_query
from travelplanner.food.nutrition import FoodNutritionProfile
from travelplanner.recipe_hints import NutritionMacros

logger = logging.getLogger(__name__)
_API_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search"
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

# In-memory cache for ingredient lookups: cleaned_name -> FoodNutritionProfile | None
_CACHE: dict[str, FoodNutritionProfile | None] = {}


def food_data_api_key() -> str | None:
  return settings.usda_fooddata_api_key()


def _extract_macros(food: dict[str, Any]) -> NutritionMacros:
  """Parse nutrient amounts per 100g, carefully distinguishing KCAL from kJ."""
  kcal_value: float | None = None
  kj_value: float | None = None
  protein_g = 0.0
  carbs_g = 0.0
  fat_g = 0.0
  fiber_g = 0.0
  sugar_g = 0.0
  sodium_mg = 0.0

  for nutrient in food.get("foodNutrients", []):
    if not isinstance(nutrient, dict):
      continue
    name = str(nutrient.get("nutrientName") or nutrient.get("name") or "").strip().casefold()
    unit = str(nutrient.get("unitName") or "").strip().upper()
    number = str(nutrient.get("nutrientNumber") or "").strip()
    amount = nutrient.get("value") if "value" in nutrient else nutrient.get("amount")
    if not isinstance(amount, (int, float)) or isinstance(amount, bool):
      continue
    val = float(amount)

    # Energy (distinguish KCAL vs kJ)
    if number == "208" or unit == "KCAL" or (("energy" in name or "atwater" in name) and unit != "KJ"):
      kcal_value = val
    elif number == "268" or unit == "KJ" or ("energy" in name and unit == "KJ"):
      kj_value = val

    if number == "203" or name == "protein":
      protein_g = val
    elif number == "205" or "carbohydrate" in name:
      carbs_g = val
    elif number == "204" or "total lipid" in name or name == "fat":
      fat_g = val
    elif number == "291" or "fiber" in name:
      fiber_g = val
    elif number == "269" or "sugar" in name:
      sugar_g = val
    elif number == "307" or "sodium" in name:
      sodium_mg = val

  # If KCAL was missing but kJ was provided, convert kJ to kcal (1 kcal = 4.184 kJ)
  if kcal_value is None and kj_value is not None:
    kcal_value = kj_value / 4.184

  # Fallback to standard 4-4-9 Atwater calculation if no explicit energy entry
  calories = kcal_value if kcal_value is not None else (protein_g * 4.0 + carbs_g * 4.0 + fat_g * 9.0)

  return NutritionMacros(
    calories_kcal=max(0.0, calories),
    protein_g=max(0.0, protein_g),
    carbohydrates_g=max(0.0, carbs_g),
    fat_g=max(0.0, fat_g),
    fiber_g=max(0.0, fiber_g),
    sugar_g=max(0.0, sugar_g),
    sodium_mg=max(0.0, sodium_mg),
  )


def _rank_food_candidate(query: str, food: dict[str, Any]) -> float:
  """Score food candidate to favor standard raw whole foods over processed foods."""
  desc = str(food.get("description") or "").casefold()
  data_type = str(food.get("dataType") or "")
  score = float(food.get("score") or 0.0)

  # Boost standard reference whole foods
  if data_type in ("Foundation", "SR Legacy"):
    score += 50.0
  elif data_type == "Survey (FNDDS)":
    score += 20.0

  # Favor raw/fresh whole ingredients when the query is simple
  if ", raw" in desc:
    score += 30.0

  # Penalize processed modifiers if query didn't ask for them
  penalties = ("sauce", "dip", "dressing", "flavored", "seasoning", "chips", "bagel", "bread", "candy", "nugget")
  for p in penalties:
    if p in desc and p not in query:
      score -= 40.0

  if desc.startswith(query):
    score += 25.0

  return score


def _fetch_usda(query: str, data_types: list[str], key: str) -> list[dict[str, Any]]:
  payload = json.dumps({
    "query": query,
    "dataType": data_types,
    "pageSize": 5,
  }).encode("utf-8")
  request = urllib.request.Request(
    f"{_API_BASE}?api_key={key}",
    data=payload,
    headers={
      "Content-Type": "application/json",
      "User-Agent": "social-media-travel-planner",
    },
  )
  try:
    with urllib.request.urlopen(request, timeout=10, context=_SSL_CONTEXT) as response:
      data = json.loads(response.read().decode("utf-8"))
      foods = data.get("foods") if isinstance(data, dict) else None
      return [f for f in foods if isinstance(f, dict)] if isinstance(foods, list) else []
  except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
    logger.warning("USDA food lookup failed query=%s error=%s", query, exc)
    return []


def search_food(ingredient_name: str) -> FoodNutritionProfile | None:
  """Return the best USDA match's per-100g nutrients, or ``None``."""
  key = food_data_api_key()
  if not key or not ingredient_name.strip():
    return None

  cleaned = clean_ingredient_query(ingredient_name)
  if not cleaned:
    return None

  if cleaned in _CACHE:
    return _CACHE[cleaned]

  # First search reference whole foods
  foods = _fetch_usda(cleaned, ["Foundation", "SR Legacy", "Survey (FNDDS)"], key)
  # Fallback to branded foods if reference datasets yield nothing
  if not foods:
    foods = _fetch_usda(cleaned, ["Branded"], key)

  if not foods:
    _CACHE[cleaned] = None
    return None

  best_food = max(foods, key=lambda f: _rank_food_candidate(cleaned, f))
  macros = _extract_macros(best_food)
  profile = FoodNutritionProfile(macros=macros, source="USDA FoodData Central")
  _CACHE[cleaned] = profile
  return profile


def clear_food_cache() -> None:
  """Clear the in-memory lookup cache (useful in tests)."""
  _CACHE.clear()
