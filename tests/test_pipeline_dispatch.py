from travelplanner.flow.pipelines.instagram import (
  INSTAGRAM_HEAD_STEPS,
  INSTAGRAM_TAIL_BY_RESOURCE_TYPE,
  SHARED_CLOSE_STEPS,
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
  assert [step.name for step in SHARED_CLOSE_STEPS] == [
    "extract_places",
    "process_place_mentions",
  ]


def test_timeline_pipeline_starts_at_locate() -> None:
  from travelplanner.flow.pipelines.timeline import TIMELINE_VISIT_STEPS

  assert TIMELINE_VISIT_STEPS[0].name == "locate_by_name"
  assert "fetch_media" not in {step.name for step in TIMELINE_VISIT_STEPS}
  assert {step.name for step in TIMELINE_VISIT_STEPS} >= {
    "locate_by_coordinates",
    "nearby_pois",
    "upsert_place",
  }
