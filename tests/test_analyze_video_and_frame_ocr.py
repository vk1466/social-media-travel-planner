from unittest.mock import patch

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.steps.instagram.analyze_video import analyze_video
from travelplanner.steps.instagram.extract_reel_frame_text import (
  extract_reel_frame_text,
)


def test_analyze_video_skips_when_flag_off() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/reel/abc/",
    user_id="u1",
    resource_type="reel",
    shortcode="abc",
  )
  try:
    FeatureFlag.set("extract_video_analysis", False)
    with patch(
      "travelplanner.steps.instagram.analyze_video.fetch_video_analysis"
    ) as mock_fetch:
      result = analyze_video(ctx)
    mock_fetch.assert_not_called()
    assert result.video_analysis is None
  finally:
    FeatureFlag.set("extract_video_analysis", True)


def test_analyze_video_sets_context_when_enabled() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/reel/abc/",
    user_id="u1",
    resource_type="reel",
    shortcode="abc",
  )
  FeatureFlag.set("extract_video_analysis", True)
  with patch(
    "travelplanner.steps.instagram.analyze_video.fetch_video_analysis",
    return_value="Place: Håen (viewpoint) — overlay",
  ) as mock_fetch:
    result = analyze_video(ctx)
  mock_fetch.assert_called_once_with("https://www.instagram.com/reel/abc/")
  assert result.video_analysis == "Place: Håen (viewpoint) — overlay"


def test_extract_reel_frame_text_skips_when_flag_off() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/reel/abc/",
    user_id="u1",
    resource_type="reel",
    shortcode="abc",
    raw_payload={"video_url": "https://cdn.example/v.mp4"},
  )
  try:
    FeatureFlag.set("extract_reel_frame_text", False)
    with patch(
      "travelplanner.steps.instagram.extract_reel_frame_text.read_reel_frame_text"
    ) as mock_read:
      result = extract_reel_frame_text(ctx)
    mock_read.assert_not_called()
    assert result.image_text is None
  finally:
    FeatureFlag.set("extract_reel_frame_text", True)


def test_extract_reel_frame_text_sets_image_text_when_enabled() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/reel/abc/",
    user_id="u1",
    resource_type="reel",
    shortcode="abc",
    raw_payload={"video_url": "https://cdn.example/v.mp4"},
  )
  FeatureFlag.set("extract_reel_frame_text", True)
  with patch(
    "travelplanner.steps.instagram.extract_reel_frame_text.read_reel_frame_text",
    return_value="Håen📍",
  ) as mock_read:
    result = extract_reel_frame_text(ctx)
  mock_read.assert_called_once_with("https://cdn.example/v.mp4")
  assert result.image_text == "Håen📍"
