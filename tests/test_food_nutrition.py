import pytest

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.food.nutrition import FoodNutritionProfile, calculate_recipe_nutrition
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.recipe_hints import ExtractedRecipe, NutritionMacros, RecipeIngredient
from travelplanner.steps.calculate_recipe_nutrition import calculate_recipe_nutrition_step


def test_calculate_recipe_nutrition_returns_per_serving_macros() -> None:
  recipe = ExtractedRecipe(
    servings="2 servings",
    ingredients=(
      RecipeIngredient("chicken", amount_numeric=200, unit="g"),
      RecipeIngredient("rice", amount_numeric=4, unit="oz"),
    ),
  )
  profiles = {
    "chicken": FoodNutritionProfile(NutritionMacros(100, 20, 0, 2)),
    "rice": FoodNutritionProfile(NutritionMacros(200, 4, 40, 1)),
  }

  nutrition = calculate_recipe_nutrition(recipe, profiles.get)

  assert nutrition is not None
  assert nutrition.is_complete is True
  assert nutrition.recipe_total.calories_kcal == pytest.approx(426.796185)
  assert nutrition.per_serving.protein_g == pytest.approx(22.26796185)
  assert nutrition.recipe_total.carbohydrates_g == pytest.approx(45.359237)


def test_calculate_recipe_nutrition_marks_unmeasured_ingredients_partial() -> None:
  recipe = ExtractedRecipe(
    servings="4",
    ingredients=(RecipeIngredient("chicken", amount_numeric=400, unit="g"), RecipeIngredient("oil", amount="a drizzle")),
  )
  nutrition = calculate_recipe_nutrition(recipe, lambda _: FoodNutritionProfile(NutritionMacros(100, 20, 0, 2)))

  assert nutrition is not None
  assert nutrition.is_complete is False
  assert nutrition.matched_ingredient_count == 1
  assert nutrition.ingredient_count == 2


def test_calculate_recipe_nutrition_requires_a_stated_serving_count() -> None:
  recipe = ExtractedRecipe(ingredients=(RecipeIngredient("chicken", amount_numeric=100, unit="g"),))
  assert calculate_recipe_nutrition(recipe, lambda _: FoodNutritionProfile(NutritionMacros(100, 20, 0, 2))) is None


def test_nutrition_step_respects_feature_flag(monkeypatch) -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "food"), post_url="https://instagram.com/reel/food",
    platform=Platform.INSTAGRAM, media_kind="reel", caption="", extracted_recipe=ExtractedRecipe(
      servings="1", ingredients=(RecipeIngredient("chicken", amount_numeric=100, unit="g"),),
    ),
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)
  previous = FeatureFlag.get("recipe_nutrition")
  monkeypatch.setattr(
    "travelplanner.steps.calculate_recipe_nutrition.search_food",
    lambda _: FoodNutritionProfile(NutritionMacros(100, 20, 0, 2)),
  )
  try:
    FeatureFlag.set("recipe_nutrition", False)
    assert calculate_recipe_nutrition_step(ctx).post == post
    FeatureFlag.set("recipe_nutrition", True)
    result = calculate_recipe_nutrition_step(ctx)
    assert result.post is not None and result.post.extracted_recipe is not None
    assert result.post.extracted_recipe.nutrition is not None
  finally:
    FeatureFlag.set("recipe_nutrition", previous)
