from unittest.mock import patch

from travelplanner.feature_flag import FeatureFlag
from travelplanner.flow.context import IngestContext
from travelplanner.steps.instagram.extract_image_text import extract_image_text
from travelplanner.steps.instagram.media import (
  MAX_SLIDE_IMAGE_URLS,
  extract_slide_image_urls,
)


def test_extract_slide_image_urls_from_sidecar() -> None:
  raw = {
    "__typename": "GraphSidecar",
    "display_url": "https://cdn.example/cover.jpg",
    "edge_sidecar_to_children": {
      "edges": [
        {"node": {"display_url": "https://cdn.example/a.jpg", "is_video": False}},
        {"node": {"display_url": "https://cdn.example/b.jpg", "is_video": False}},
        {"node": {"thumbnail_src": "https://cdn.example/c.jpg", "is_video": False}},
      ]
    },
  }
  assert extract_slide_image_urls(raw) == [
    "https://cdn.example/a.jpg",
    "https://cdn.example/b.jpg",
    "https://cdn.example/c.jpg",
  ]


def test_extract_slide_image_urls_caps_and_dedupes() -> None:
  edges = [
    {"node": {"display_url": f"https://cdn.example/{i}.jpg"}}
    for i in range(MAX_SLIDE_IMAGE_URLS + 5)
  ]
  edges.insert(1, {"node": {"display_url": "https://cdn.example/0.jpg"}})
  raw = {"edge_sidecar_to_children": {"edges": edges}}
  urls = extract_slide_image_urls(raw)
  assert len(urls) == MAX_SLIDE_IMAGE_URLS
  assert urls[0] == "https://cdn.example/0.jpg"
  assert len(set(urls)) == len(urls)


def test_extract_slide_image_urls_falls_back_to_cover() -> None:
  raw = {"display_url": "https://cdn.example/only.jpg"}
  assert extract_slide_image_urls(raw) == ["https://cdn.example/only.jpg"]


def test_extract_slide_image_urls_empty() -> None:
  assert extract_slide_image_urls({}) == []


def test_extract_image_text_skips_when_flag_off() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/p/abc/",
    user_id="u1",
    resource_type="carousel",
    shortcode="abc",
    raw_payload={
      "edge_sidecar_to_children": {
        "edges": [{"node": {"display_url": "https://cdn.example/a.jpg"}}]
      }
    },
  )
  try:
    FeatureFlag.set("extract_image_text", False)
    with patch(
      "travelplanner.steps.instagram.extract_image_text.read_image_urls_text"
    ) as mock_read:
      result = extract_image_text(ctx)
    mock_read.assert_not_called()
    assert result.image_text is None
  finally:
    FeatureFlag.set("extract_image_text", True)


def test_extract_image_text_sets_image_text_when_enabled() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/p/abc/",
    user_id="u1",
    resource_type="carousel",
    shortcode="abc",
    raw_payload={
      "edge_sidecar_to_children": {
        "edges": [
          {"node": {"display_url": "https://cdn.example/a.jpg"}},
          {"node": {"display_url": "https://cdn.example/b.jpg"}},
        ]
      }
    },
  )
  FeatureFlag.set("extract_image_text", True)
  with patch(
    "travelplanner.steps.instagram.extract_image_text.read_image_urls_text",
    return_value="Café Nin\nPanadería Rosetta",
  ) as mock_read:
    result = extract_image_text(ctx)
  mock_read.assert_called_once_with(
    ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]
  )
  assert result.image_text == "Café Nin\nPanadería Rosetta"


def test_extract_image_text_skips_non_image_resource() -> None:
  ctx = IngestContext(
    post_url="https://www.instagram.com/reel/abc/",
    user_id="u1",
    resource_type="reel",
  )
  FeatureFlag.set("extract_image_text", True)
  with patch(
    "travelplanner.steps.instagram.extract_image_text.read_image_urls_text"
  ) as mock_read:
    result = extract_image_text(ctx)
  mock_read.assert_not_called()
  assert result.image_text is None
