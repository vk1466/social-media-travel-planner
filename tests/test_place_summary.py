"""Unit tests for place summary synthesis, tip sanitization, and content asset persistence."""

from __future__ import annotations

from travelplanner.db.places_repo import place_from_dict, place_to_dict
from travelplanner.db.posts_repo import post_from_dict, post_to_dict
from travelplanner.models import (
  Platform,
  Place,
  PlaceFacts,
  PlaceLocation,
  SavedPost,
)
from travelplanner.places.summary import sanitize_place_tips, synthesize_place_summary


def test_sanitize_place_tips_deduplicates_and_cleans() -> None:
  raw_tips = [
    "💡 Book tickets online in advance",
    "book tickets online in advance!",
    "Tip: Wear comfortable walking shoes for the cobblestones",
    "Wear comfortable walking shoes for the cobblestone streets",
    "try the warm stroopwafel",
  ]
  cleaned = sanitize_place_tips(raw_tips)
  # Should eliminate duplicates and strip prefixes
  assert len(cleaned) == 3
  assert cleaned[0] == "Book tickets online in advance"
  assert cleaned[1] == "Wear comfortable walking shoes for the cobblestones"
  assert cleaned[2] == "Try the warm stroopwafel"


def test_synthesize_place_summary_with_details_and_famous_for() -> None:
  loc = PlaceLocation(
    display_name="Moco Museum",
    city="Amsterdam",
    country="Netherlands",
  )
  facts = PlaceFacts(
    status="complete",
    fetched_at="2026-09-13T12:00:00Z",
    famous_for="Art museum featuring works by Banksy and Dalí.",
  )
  details = ["Interactive digital art installations in the basement."]

  summary = synthesize_place_summary(
    display_name="Moco Museum",
    category="museum",
    location=loc,
    details=details,
    facts=facts,
  )
  assert summary is not None
  assert "Banksy" in summary
  assert "Interactive digital art installations" in summary


def test_synthesize_place_summary_fallback() -> None:
  loc = PlaceLocation(
    display_name="Canal View",
    city="Amsterdam",
    country="Netherlands",
  )
  summary = synthesize_place_summary(
    display_name="Canal View",
    category="viewpoint",
    location=loc,
  )
  assert summary == "A notable viewpoint in Amsterdam, Netherlands."


def test_saved_post_content_assets_roundtrip() -> None:
  post = SavedPost(
    post_id="instagram:test123",
    post_url="https://instagram.com/p/test123/",
    platform=Platform.INSTAGRAM,
    media_kind="carousel",
    caption="Amsterdam highlights",
    image_text="1. Moco Museum\n2. Anne Frank House",
    transcript="Welcome to Amsterdam canals",
    video_analysis="Scene: Kayaking through the canal waterways",
    slide_media_urls=("https://cdn.example.com/s1.jpg", "https://cdn.example.com/s2.jpg"),
  )
  serialized = post_to_dict(post)
  assert serialized["image_text"] == "1. Moco Museum\n2. Anne Frank House"
  assert serialized["transcript"] == "Welcome to Amsterdam canals"
  assert serialized["video_analysis"] == "Scene: Kayaking through the canal waterways"
  assert serialized["slide_media_urls"] == ("https://cdn.example.com/s1.jpg", "https://cdn.example.com/s2.jpg")

  restored = post_from_dict(serialized)
  assert restored.image_text == post.image_text
  assert restored.transcript == post.transcript
  assert restored.video_analysis == post.video_analysis
  assert restored.slide_media_urls == post.slide_media_urls


def test_place_summary_roundtrip() -> None:
  place = Place(
    place_id="nl-amsterdam-moco",
    display_name="Moco Museum",
    location=PlaceLocation(display_name="Moco Museum", city="Amsterdam", country="Netherlands"),
    summary="A vibrant boutique museum with Banksy exhibits.",
  )
  serialized = place_to_dict(place)
  assert serialized["summary"] == "A vibrant boutique museum with Banksy exhibits."

  restored = place_from_dict(serialized)
  assert restored.summary == place.summary
