from travelplanner.flow.pipelines.dispatch import close_steps_for_category
from travelplanner.flow.pipelines.instagram import (
  INSTAGRAM_HEAD_STEPS,
  INSTAGRAM_TAIL_BY_RESOURCE_TYPE,
  MOVIE_CLOSE_STEPS,
  PLACE_CLOSE_STEPS,
)


def test_instagram_tail_by_resource_type() -> None:
  assert [step.name for step in INSTAGRAM_HEAD_STEPS] == [
    "seed_instagram_post",
    "fetch_media",
    "persist_thumbnail",
  ]
  assert [step.name for step in INSTAGRAM_TAIL_BY_RESOURCE_TYPE["reel"]] == [
    "fetch_transcript",
    "analyze_video",
    "extract_reel_frame_text",
  ]
  assert [step.name for step in INSTAGRAM_TAIL_BY_RESOURCE_TYPE["video"]] == [
    "fetch_transcript",
    "analyze_video",
    "extract_reel_frame_text",
  ]
  assert [step.name for step in INSTAGRAM_TAIL_BY_RESOURCE_TYPE["image"]] == [
    "extract_image_text",
  ]
  assert [step.name for step in INSTAGRAM_TAIL_BY_RESOURCE_TYPE["carousel"]] == [
    "extract_image_text",
  ]
  assert [step.name for step in PLACE_CLOSE_STEPS] == [
    "extract_places",
    "process_place_mentions",
  ]
  assert [step.name for step in MOVIE_CLOSE_STEPS] == [
    "extract_movies",
    "resolve_movies",
  ]


def test_close_steps_dispatch_by_category() -> None:
  place_name, place_steps = close_steps_for_category("travel")
  assert place_name == "instagram_place_close"
  assert place_steps == PLACE_CLOSE_STEPS

  unset_name, unset_steps = close_steps_for_category(None)
  assert unset_name == "instagram_place_close"
  assert unset_steps == PLACE_CLOSE_STEPS

  movie_name, movie_steps = close_steps_for_category("movies")
  assert movie_name == "instagram_movie_close"
  assert movie_steps == MOVIE_CLOSE_STEPS

  food_name, food_steps = close_steps_for_category("food")
  assert food_name == "instagram_place_close"
  assert food_steps == PLACE_CLOSE_STEPS

  skip_name, skip_steps = close_steps_for_category("fashion")
  assert skip_name == "instagram_close_skipped"
  assert skip_steps == ()


def test_timeline_pipeline_starts_at_locate() -> None:
  from travelplanner.flow.pipelines.timeline import TIMELINE_VISIT_STEPS

  assert TIMELINE_VISIT_STEPS[0].name == "locate_by_name"
  assert "fetch_media" not in {step.name for step in TIMELINE_VISIT_STEPS}
  assert {step.name for step in TIMELINE_VISIT_STEPS} >= {
    "locate_by_coordinates",
    "nearby_pois",
    "upsert_place",
  }
