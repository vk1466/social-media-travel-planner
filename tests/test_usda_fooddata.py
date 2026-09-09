import json
from unittest.mock import MagicMock, patch

from travelplanner.clients.usda_fooddata import (
  _extract_macros,
  _rank_food_candidate,
  clear_food_cache,
  search_food,
)
from travelplanner.food.ingredient_cleaner import clean_ingredient_query


def test_clean_ingredient_query_strips_culinary_noise() -> None:
  assert clean_ingredient_query("boneless skinless chicken thighs, cut into bite-sized pieces") == "chicken thigh"
  assert clean_ingredient_query("freshly grated parmesan cheese") == "parmesan cheese"
  assert clean_ingredient_query("extra virgin olive oil") == "extra virgin olive oil"
  assert clean_ingredient_query("4 garlic cloves, minced") == "garlic"
  assert clean_ingredient_query("2 cups baby spinach leaves") == "baby spinach leaf"
  assert clean_ingredient_query("unsalted butter, softened at room temperature") == "butter"
  assert clean_ingredient_query("kosher salt and black pepper to taste") == "kosher salt and black pepper"


def test_extract_macros_distinguishes_kcal_from_kj() -> None:
  # In USDA, energy is often provided in both KCAL and kJ.
  # kJ MUST NOT overwrite KCAL.
  food_with_both = {
    "foodNutrients": [
      {"nutrientName": "Energy", "unitName": "KCAL", "value": 250.0},
      {"nutrientName": "Energy", "unitName": "kJ", "value": 1046.0},
      {"nutrientName": "Protein", "unitName": "G", "value": 20.0},
      {"nutrientName": "Carbohydrate, by difference", "unitName": "G", "value": 10.0},
      {"nutrientName": "Total lipid (fat)", "unitName": "G", "value": 5.0},
    ]
  }
  macros = _extract_macros(food_with_both)
  assert macros.calories_kcal == 250.0
  assert macros.protein_g == 20.0
  assert macros.carbohydrates_g == 10.0
  assert macros.fat_g == 5.0


def test_extract_macros_converts_kj_if_kcal_absent() -> None:
  food_only_kj = {
    "foodNutrients": [
      {"nutrientName": "Energy", "unitName": "KJ", "value": 418.4},
      {"nutrientName": "Protein", "unitName": "G", "value": 10.0},
    ]
  }
  macros = _extract_macros(food_only_kj)
  assert round(macros.calories_kcal, 1) == 100.0


def test_rank_food_candidate_favors_whole_raw_foods_over_processed() -> None:
  raw_onion = {
    "description": "Onions, raw",
    "dataType": "SR Legacy",
    "score": 100.0,
  }
  onion_bagel = {
    "description": "ONION BAGEL",
    "dataType": "Branded",
    "score": 100.0,
  }
  garlic_sauce = {
    "description": "Garlic sauce",
    "dataType": "Survey (FNDDS)",
    "score": 100.0,
  }
  raw_garlic = {
    "description": "Garlic, raw",
    "dataType": "Foundation",
    "score": 100.0,
  }

  assert _rank_food_candidate("onion", raw_onion) > _rank_food_candidate("onion", onion_bagel)
  assert _rank_food_candidate("garlic", raw_garlic) > _rank_food_candidate("garlic", garlic_sauce)


def test_search_food_uses_cache(monkeypatch) -> None:
  clear_food_cache()
  monkeypatch.setattr("travelplanner.clients.usda_fooddata.food_data_api_key", lambda: "test-key")

  mock_response = MagicMock()
  mock_response.read.return_value = json.dumps({
    "foods": [
      {
        "description": "Chicken, raw",
        "dataType": "Foundation",
        "foodNutrients": [
          {"nutrientName": "Energy", "unitName": "KCAL", "value": 165.0},
          {"nutrientName": "Protein", "unitName": "G", "value": 31.0},
        ],
      }
    ]
  }).encode("utf-8")
  mock_response.__enter__.return_value = mock_response

  with patch("urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
    p1 = search_food("chicken breast")
    assert p1 is not None
    assert p1.macros.calories_kcal == 165.0

    # Second call should hit the in-memory cache without calling urlopen again
    p2 = search_food("chicken breast")
    assert p2 is not None
    assert mock_urlopen.call_count == 1
