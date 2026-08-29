from travelplanner.content_categories import (
  CLOSE_PIPELINE_MOVIE,
  CLOSE_PIPELINE_PLACE,
  close_pipeline_for_category,
  inferred_content_category,
  normalize_content_category,
)
from travelplanner.content_classify import CLASSIFY_PROMPT
from travelplanner.models import Platform, SavedPost, make_post_id


def test_normalize_drops_unknown() -> None:
  assert normalize_content_category("travel") == "travel"
  assert normalize_content_category("Movies") == "movies"
  assert normalize_content_category("nope") is None
  assert normalize_content_category(None) is None
  assert normalize_content_category("  ") is None


def test_inferred_uses_stored_then_place_ids() -> None:
  base = dict(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/p/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="hello",
  )
  fashion = SavedPost(**base, content_category="fashion")
  assert inferred_content_category(fashion) == "fashion"

  travel_places = SavedPost(**base, place_ids=("p1",))
  assert inferred_content_category(travel_places) == "travel"

  empty = SavedPost(**base)
  assert inferred_content_category(empty) == "other"


def test_close_pipeline_for_category() -> None:
  assert close_pipeline_for_category("travel") == CLOSE_PIPELINE_PLACE
  assert close_pipeline_for_category(None) == CLOSE_PIPELINE_PLACE
  assert close_pipeline_for_category("movies") == CLOSE_PIPELINE_MOVIE
  assert close_pipeline_for_category("fashion") is None
  assert close_pipeline_for_category("hairstyle") is None
  assert close_pipeline_for_category("food") is None
  assert close_pipeline_for_category("other") is None


def test_classify_prompt_includes_tv_series() -> None:
  assert "TV series" in CLASSIFY_PROMPT


def test_classify_prompt_sends_venues_to_travel() -> None:
  assert "visitable venue" in CLASSIFY_PROMPT
  assert "use travel, not food" in CLASSIFY_PROMPT
