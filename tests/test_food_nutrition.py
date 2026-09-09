import pytest

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.food.nutrition import FoodNutritionProfile, calculate_recipe_nutrition, ingredient_grams
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.recipe_hints import ExtractedRecipe, NutritionMacros, RecipeIngredient, RecipeNutrition
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
  assert nutrition.matched_ingredients == ("chicken", "rice")
  assert nutrition.unmatched_ingredients == ()
  assert nutrition.servings_inferred is False


def test_calculate_recipe_nutrition_marks_unmeasured_ingredients_partial() -> None:
  recipe = ExtractedRecipe(
    servings="4",
    ingredients=(
      RecipeIngredient("chicken", amount_numeric=400, unit="g"),
      RecipeIngredient("oil", amount="a drizzle"),
    ),
  )
  nutrition = calculate_recipe_nutrition(recipe, lambda _: FoodNutritionProfile(NutritionMacros(100, 20, 0, 2)))

  assert nutrition is not None
  assert nutrition.is_complete is False
  assert nutrition.matched_ingredient_count == 1
  assert nutrition.ingredient_count == 2
  assert nutrition.matched_ingredients == ("chicken",)
  assert nutrition.unmatched_ingredients == ("oil",)


def test_calculate_recipe_nutrition_strict_servings_flag() -> None:
  recipe = ExtractedRecipe(ingredients=(RecipeIngredient("chicken", amount_numeric=100, unit="g"),))
  assert calculate_recipe_nutrition(recipe, lambda _: FoodNutritionProfile(NutritionMacros(100, 20, 0, 2)), allow_inferred_servings=False) is None


def test_calculate_recipe_nutrition_infers_servings_when_unspecified() -> None:
  recipe = ExtractedRecipe(
    meal_type="breakfast",
    ingredients=(RecipeIngredient("oatmeal", amount_numeric=50, unit="g"),),
  )
  nutrition = calculate_recipe_nutrition(recipe, lambda _: FoodNutritionProfile(NutritionMacros(350, 12, 60, 5)))
  assert nutrition is not None
  assert nutrition.servings == 1.0
  assert nutrition.servings_inferred is True


def test_calculate_recipe_nutrition_with_volume_and_counts() -> None:
  recipe = ExtractedRecipe(
    servings="2",
    ingredients=(
      RecipeIngredient("olive oil", amount_numeric=2, unit="tbsp"),
      RecipeIngredient("garlic", amount_numeric=4, unit="clove"),
      RecipeIngredient("egg", amount_numeric=2, unit=""),
    ),
  )
  profiles = {
    "olive oil": FoodNutritionProfile(NutritionMacros(calories_kcal=900, protein_g=0, carbohydrates_g=0, fat_g=100)),
    "garlic": FoodNutritionProfile(NutritionMacros(calories_kcal=140, protein_g=6, carbohydrates_g=30, fat_g=0)),
    "egg": FoodNutritionProfile(NutritionMacros(calories_kcal=143, protein_g=12.5, carbohydrates_g=0.7, fat_g=9.5)),
  }
  nutrition = calculate_recipe_nutrition(recipe, profiles.get)
  assert nutrition is not None
  assert nutrition.is_complete is True
  # 2 tbsp oil = ~27.2g oil = ~244.8 kcal
  # 4 cloves garlic = 12g = ~16.8 kcal
  # 2 eggs = 100g = ~143 kcal
  assert 390 < nutrition.recipe_total.calories_kcal < 420
  assert 190 < nutrition.per_serving.calories_kcal < 210
  assert nutrition.per_serving.protein_g > 6.0


def test_calculate_recipe_nutrition_uses_estimated_grams() -> None:
  assert ingredient_grams(amount=None, unit=None, estimated_grams=75.0) == 75.0
  recipe = ExtractedRecipe(
    servings="1",
    ingredients=(RecipeIngredient("special cheese", estimated_grams=50.0),),
  )
  nutrition = calculate_recipe_nutrition(recipe, lambda _: FoodNutritionProfile(NutritionMacros(400, 25, 2, 33)))
  assert nutrition is not None
  assert nutrition.recipe_total.calories_kcal == pytest.approx(200.0)


def test_nutrition_step_respects_feature_flag(monkeypatch) -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "food"),
    post_url="https://instagram.com/reel/food",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="",
    extracted_recipe=ExtractedRecipe(
      servings="1",
      ingredients=(RecipeIngredient("chicken", amount_numeric=100, unit="g"),),
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


def test_calculate_recipe_nutrition_falls_back_to_ai_on_low_coverage(monkeypatch) -> None:
  recipe = ExtractedRecipe(
    servings="2",
    ingredients=(
      RecipeIngredient("chana dal", amount_numeric=100, unit="g"),
      RecipeIngredient("sooji", amount_numeric=100, unit="g"),
      RecipeIngredient("curry leaves", amount="a few"),
      RecipeIngredient("oil", amount="for frying"),
    ),
  )
  mock_ai_nut = RecipeNutrition(
    recipe_total=NutritionMacros(calories_kcal=600, protein_g=20, carbohydrates_g=80, fat_g=10),
    per_serving=NutritionMacros(calories_kcal=300, protein_g=10, carbohydrates_g=40, fat_g=5),
    servings=2.0,
    matched_ingredient_count=4,
    ingredient_count=4,
    is_complete=True,
    source="AI Nutritionist",
    macro_highlights=("High Protein", "Good Fiber"),
    dietary_fit=("Vegetarian",),
  )
  monkeypatch.setattr("travelplanner.food.ai_nutrition.estimate_recipe_nutrition_ai", lambda _: mock_ai_nut)

  # Only 1 of 4 matches in DB (25% coverage < 75%)
  nutrition = calculate_recipe_nutrition(
    recipe,
    lambda name: FoodNutritionProfile(NutritionMacros(100, 20, 0, 2)) if "chana" in name else None,
    use_ai_fallback=True,
  )

  assert nutrition is not None
  assert nutrition.source == "AI Nutritionist"
  assert nutrition.per_serving.calories_kcal == 300
  assert "High Protein" in nutrition.macro_highlights
