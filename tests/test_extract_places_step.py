from dataclasses import replace
from unittest.mock import patch

from travelplanner.extract import ContentBundle, ContentExtraction, ContentSnippet
from travelplanner.flow.context import IngestContext
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.place_hints import ExtractedPlace
from travelplanner.steps.extract_places import extract_places


def test_extract_places_uses_snippets_not_instagram() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/p/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="Visit Smith Rock",
  )
  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post)
  extracted = ContentExtraction(
    places=(ExtractedPlace(place_name="Smith Rock", category="park"),),
    reel_summary="A day at Smith Rock.",
  )

  with patch(
    "travelplanner.steps.extract_places.fetch_places_from_snippets",
    return_value=extracted,
  ) as mock_fetch:
    result = extract_places(ctx)

  assert mock_fetch.call_count == 1
  snippets = mock_fetch.call_args.args[0]
  assert snippets == (ContentSnippet(source="caption", text="Visit Smith Rock"),)
  assert result.content_bundle == ContentBundle(caption="Visit Smith Rock")
  assert result.post is not None
  assert result.post.extracted_places == extracted.places
  assert result.post.reel_summary == extracted.reel_summary


def test_extract_places_includes_video_analysis_and_image_text() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, "abc"),
    post_url="https://www.instagram.com/reel/abc/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="Trip tip",
  )
  ctx = IngestContext(
    post_url=post.post_url,
    user_id="u1",
    post=post,
    video_analysis="Place: Værøy (island) — map",
    image_text="Håen📍",
  )
  extracted = ContentExtraction(
    places=(ExtractedPlace(place_name="Håen", category="viewpoint"),),
  )

  with patch(
    "travelplanner.steps.extract_places.fetch_places_from_snippets",
    return_value=extracted,
  ) as mock_fetch:
    extract_places(ctx)

  sources = [s.source for s in mock_fetch.call_args.args[0]]
  assert sources == ["caption", "video_analysis", "image_text"]


def test_extract_places_prefers_existing_content_bundle() -> None:
  post = SavedPost(
    post_id=make_post_id(Platform.YOUTUBE, "vid1"),
    post_url="https://youtu.be/vid1",
    platform=Platform.YOUTUBE,
    media_kind="video",
    caption="ignored",
  )
  bundle = ContentBundle(caption="Yosemite Valley", transcript="Stop at Tunnel View")
  ctx = IngestContext(
    post_url=post.post_url,
    user_id="u1",
    post=post,
    content_bundle=bundle,
  )
  extracted = ContentExtraction(
    places=(ExtractedPlace(place_name="Tunnel View"),),
  )

  with patch(
    "travelplanner.steps.extract_places.fetch_places_from_snippets",
    return_value=extracted,
  ) as mock_fetch:
    result = extract_places(ctx)

  snippets = mock_fetch.call_args.args[0]
  assert [s.source for s in snippets] == ["caption", "transcript"]
  assert result.post is not None
  assert result.post.extracted_places[0].place_name == "Tunnel View"
  # Original caption on post unchanged; extraction uses bundle.
  assert result.post.caption == "ignored"
  assert result.post == replace(
    post,
    extracted_places=extracted.places,
    reel_summary=None,
  )
