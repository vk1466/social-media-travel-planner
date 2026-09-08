from unittest.mock import patch

from travelplanner.extract import ContentSnippet
from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.recipe_extract import _parse_extracted_recipe
from travelplanner.recipe_hints import ExtractedRecipe, RecipeIngredient
from travelplanner.steps.extract_recipe import extract_recipe


def test_parse_recipe_keeps_missing_fields_missing() -> None:
  recipe = _parse_extracted_recipe({
    "title": "Spicy noodles", "summary": None,
    "ingredients": [{"name": "noodles", "amount": None, "unit": None, "note": None, "aisle": "Pantry & Spices"}],
    "steps": ["Toss together."], "servings": None, "prep_time_minutes": None,
    "cook_time_minutes": 10, "tags": ["spicy", "spicy"], "cuisine": "Japanese",
    "meal_type": "dinner", "difficulty": "easy", "estimated_inferred": True, "tips": ["Serve hot."],
  })
  assert recipe == ExtractedRecipe(
    title="Spicy noodles", ingredients=(RecipeIngredient("noodles", aisle="Pantry & Spices"),),
    steps=("Toss together.",), cook_time_minutes=10, tags=("spicy",), cuisine="Japanese",
    meal_type="dinner", difficulty="easy", estimated_inferred=True, tips=("Serve hot.",),
  )


def test_extract_recipe_uses_content_bundle_when_enabled() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "food"), post_url="https://instagram.com/reel/food",
    platform=Platform.INSTAGRAM, media_kind="reel", caption="Make this pasta",
  )
  recipe = ExtractedRecipe(title="Pasta")
  previous = FeatureFlag.get("food_recipes")
  FeatureFlag.set("food_recipes", True)
  try:
    with patch("travelplanner.steps.extract_recipe.fetch_recipe_from_snippets", return_value=recipe) as fetch:
      result = extract_recipe(IngestContext(post_url=post.post_url, user_id="u1", post=post))
    assert fetch.call_args.args[0] == (ContentSnippet(source="caption", text="Make this pasta"),)
    assert result.post is not None and result.post.extracted_recipe == recipe
  finally:
    FeatureFlag.set("food_recipes", previous)


def test_extract_recipe_is_enabled_by_default() -> None:
  assert FeatureFlag.get("food_recipes") is True


def test_extract_recipe_skips_when_disabled() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "food"), post_url="https://instagram.com/reel/food",
    platform=Platform.INSTAGRAM, media_kind="reel", caption="Make this pasta",
  )
  previous = FeatureFlag.get("food_recipes")
  FeatureFlag.set("food_recipes", False)
  try:
    assert extract_recipe(IngestContext(post_url=post.post_url, user_id="u1", post=post)).post == post
  finally:
    FeatureFlag.set("food_recipes", previous)


def test_parse_recipe_with_enriched_fields() -> None:
  recipe = _parse_extracted_recipe({
    "title": "Carbonara",
    "summary": "Classic Roman pasta",
    "ingredients": [
      {
        "name": "Guanciale",
        "amount": "150",
        "amount_numeric": 150.0,
        "unit": "g",
        "note": "cubed",
        "aisle": "Meat & Seafood",
        "group": "Main",
      },
      {
        "name": "Pecorino Romano",
        "amount": "1/2",
        "amount_numeric": 0.5,
        "unit": "cup",
        "note": "finely grated",
        "aisle": "Dairy & Refrigerated",
        "group": "Sauce",
      },
    ],
    "steps": [
      "Crisp guanciale in a dry pan for 8 minutes.",
      "Toss hot pasta with egg mixture for 2 minutes off heat.",
    ],
    "step_timers_seconds": [480, 120],
    "servings": "2",
    "prep_time_minutes": 10,
    "cook_time_minutes": 15,
    "tags": ["italian", "pasta"],
    "cuisine": "Italian",
    "meal_type": "dinner",
    "difficulty": "medium",
    "equipment": ["Cast Iron Skillet", "Tongs"],
    "dietary": ["pescatarian"],
    "estimated_inferred": False,
    "tips": ["Never add cream."],
  })
  assert recipe is not None
  assert len(recipe.ingredients) == 2
  assert recipe.ingredients[0].group == "Main"
  assert recipe.ingredients[0].amount_numeric == 150.0
  assert recipe.ingredients[1].group == "Sauce"
  assert recipe.ingredients[1].amount_numeric == 0.5
  assert recipe.equipment == ("Cast Iron Skillet", "Tongs")
  assert recipe.dietary == ("pescatarian",)
  assert recipe.step_timers_seconds == (480, 120)


def test_enrich_recipe_parses_timers_and_fractions() -> None:
  from travelplanner.steps.enrich_recipe import enrich_recipe

  recipe = ExtractedRecipe(
    title="Stew",
    ingredients=(
      RecipeIngredient(name="Beef", amount="1 1/2", unit="lbs"),
      RecipeIngredient(name="Carrots", amount="2", amount_numeric=2.0, unit="cups"),
    ),
    steps=("Brown the beef.", "Simmer gently for 45 minutes until tender."),
  )
  post = SavedPost(
    post_id="instagram:stew", post_url="https://instagram.com/reel/stew",
    platform=Platform.INSTAGRAM, media_kind="reel", caption="Beef stew",
    extracted_recipe=recipe,
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)
  result = enrich_recipe(ctx)
  assert result.post is not None and result.post.extracted_recipe is not None
  enriched = result.post.extracted_recipe
  # "1 1/2" parsed to 1.5
  assert enriched.ingredients[0].amount_numeric == 1.5
  assert enriched.ingredients[1].amount_numeric == 2.0
  # Step 1 has no timer, Step 2 has 45 minutes -> 2700s
  assert enriched.step_timers_seconds == (None, 2700)


def test_extract_recipe_frames_skips_when_caption_complete() -> None:
  from travelplanner.steps.extract_recipe_frames import extract_recipe_frames

  caption = (
    "Authentic Tiramisu Recipe:\n\n"
    "Ingredients:\n"
    "- 500g mascarpone\n"
    "- 4 eggs\n"
    "- 100g sugar\n"
    "- 300ml espresso\n"
    "- 1 pack ladyfingers\n\n"
    "Instructions:\n"
    "1. Whisk yolks and sugar until pale.\n"
    "2. Fold in mascarpone gently.\n"
    "3. Dip ladyfingers into espresso.\n"
    "4. Layer and chill for 4 hours.\n"
  )
  post = SavedPost(
    post_id="instagram:tiramisu", post_url="https://instagram.com/reel/tiramisu",
    platform=Platform.INSTAGRAM, media_kind="reel", caption=caption,
  )
  ctx = IngestContext(
    post_url=post.post_url, user_id="u1", post=post, resource_type="reel",
    raw_payload={"video_url": "https://cdn.example/video.mp4"},
  )
  with patch("travelplanner.steps.extract_recipe_frames.read_reel_frame_text") as mock_ocr:
    res = extract_recipe_frames(ctx)
  mock_ocr.assert_not_called()
  assert res.image_text is None


def test_extract_recipe_frames_runs_when_caption_thin() -> None:
  from travelplanner.steps.extract_recipe_frames import extract_recipe_frames

  post = SavedPost(
    post_id="instagram:short", post_url="https://instagram.com/reel/short",
    platform=Platform.INSTAGRAM, media_kind="reel", caption="So delicious! Full recipe in video 👇",
  )
  ctx = IngestContext(
    post_url=post.post_url, user_id="u1", post=post, resource_type="reel",
    raw_payload={"video_url": "https://cdn.example/video.mp4"},
  )
  with patch("travelplanner.steps.extract_recipe_frames.read_reel_frame_text", return_value="200g flour\n1 egg") as mock_ocr:
    res = extract_recipe_frames(ctx)
  mock_ocr.assert_called_once_with("https://cdn.example/video.mp4", adaptive=True)
  assert res.image_text == "200g flour\n1 egg"


def test_fetch_recipe_source_extracts_schema_org() -> None:
  from travelplanner.steps.fetch_recipe_source import fetch_recipe_source

  html = """
  <html>
  <head>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Recipe",
      "name": "Garlic Butter Shrimp",
      "recipeIngredient": ["1 lb shrimp", "4 cloves garlic", "2 tbsp butter"],
      "recipeInstructions": [{"@type": "HowToStep", "text": "Melt butter and sauté garlic."}, {"@type": "HowToStep", "text": "Cook shrimp for 3 mins."}],
      "prepTime": "PT10M",
      "cookTime": "PT5M"
    }
    </script>
  </head>
  </html>
  """
  post = SavedPost(
    post_id="instagram:shrimp", post_url="https://instagram.com/reel/shrimp",
    platform=Platform.INSTAGRAM, media_kind="reel",
    caption="Check out my garlic butter shrimp! Recipe at https://mycookingblog.com/garlic-shrimp",
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)
  with patch("travelplanner.steps.fetch_recipe_source.urllib.request.urlopen") as mock_urlopen:
    mock_resp = mock_urlopen.return_value.__enter__.return_value
    mock_resp.headers.get.return_value = "text/html"
    mock_resp.read.return_value = html.encode("utf-8")
    res = fetch_recipe_source(ctx)

  assert res.image_text is not None
  assert "Garlic Butter Shrimp" in res.image_text
  assert "1 lb shrimp" in res.image_text
  assert "Melt butter and sauté garlic." in res.image_text

def test_reconstruct_recipe_for_post_success() -> None:
  import json
  from unittest.mock import MagicMock
  from travelplanner.recipe_extract import reconstruct_recipe_for_post

  post = SavedPost(
    post_id="instagram:pasta",
    post_url="https://instagram.com/reel/pasta",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="Quick midnight pasta with chili and garlic!",
    extracted_recipe=ExtractedRecipe(title="Chili Garlic Pasta"),
  )

  mock_response = MagicMock()
  mock_response.choices = [
    MagicMock(
      message=MagicMock(
        content=json.dumps({
          "title": "Chili Garlic Pasta",
          "summary": "Quick spicy garlic pasta",
          "ingredients": [
            {
              "name": "Spaghetti",
              "amount": "200",
              "amount_numeric": 200.0,
              "unit": "g",
              "note": None,
              "aisle": "Pantry & Spices",
              "group": "Main",
            },
            {
              "name": "Garlic",
              "amount": "4",
              "amount_numeric": 4.0,
              "unit": "cloves",
              "note": "thinly sliced",
              "aisle": "Produce",
              "group": "Sauce",
            },
          ],
          "steps": [
            "Boil pasta in salted water for 9 minutes.",
            "Sauté garlic in olive oil over low heat for 3 minutes.",
          ],
          "step_timers_seconds": [540, 180],
          "servings": "2",
          "prep_time_minutes": 5,
          "cook_time_minutes": 10,
          "tags": ["pasta", "spicy"],
          "cuisine": "Italian",
          "meal_type": "dinner",
          "difficulty": "easy",
          "equipment": ["Pot", "Skillet"],
          "dietary": ["vegetarian"],
          "estimated_inferred": False,
          "tips": ["Save pasta water."],
        })
      )
    )
  ]

  with patch("travelplanner.clients.openai.get_client") as mock_get_client:
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    mock_get_client.return_value = mock_client

    reconstructed = reconstruct_recipe_for_post(post)

  assert reconstructed is not None
  assert reconstructed.title == "Chili Garlic Pasta"
  assert len(reconstructed.ingredients) == 2
  assert reconstructed.ingredients[0].name == "Spaghetti"
  assert reconstructed.estimated_inferred is True
  assert reconstructed.step_timers_seconds == (540, 180)


def test_extract_top_comments_prioritizes_creator_and_pinned() -> None:
  from travelplanner.steps.instagram.media import extract_top_comments

  raw = {
    "comments": [
      {"owner": {"username": "fan123"}, "text": "Looks delicious!"},
      {"owner": {"username": "random_user"}, "text": "Where did you get that pan?"},
      {"owner": {"username": "chef_mario"}, "text": "Full recipe: 200g rigatoni, 4 egg yolks, 100g pecorino!"},
    ]
  }
  comments = extract_top_comments(raw, author_handle="chef_mario")
  assert len(comments) == 3
  assert comments[0].startswith("Full recipe:")

