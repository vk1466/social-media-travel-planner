from __future__ import annotations

from unittest.mock import MagicMock, patch

from travelplanner.places.facts.pipeline.structured import draft_facts_from_documents
from travelplanner.places.facts.pipeline.verify import verify_facts
from travelplanner.places.facts.tools.trail_search import fetch_trail_details
from travelplanner.places.facts.types import FactQuery, SourceDocument


def test_fetch_trail_details_without_key(monkeypatch):
  monkeypatch.delenv("BROWSERLESS_API_KEY", raising=False)
  query = FactQuery(
    place_id="test-place",
    display_name="Hurricane Hill",
    category="hike",
    latitude=47.9,
    longitude=-123.5,
  )
  docs = fetch_trail_details(query)
  assert docs == []


def test_trail_facts_mapping_and_verification():
  doc = SourceDocument(
    tool_id="trail_search",
    source_name="alltrails",
    source_ref="https://www.alltrails.com/trail/us/washington/hurricane-hill-via-hurricane-ridge-trail",
    title="Hurricane Hill Trail",
    latitude=47.9,
    longitude=-123.5,
    content={
      "website": "https://www.alltrails.com/trail/us/washington/hurricane-hill-via-hurricane-ridge-trail",
      "distance_km": 5.15,
      "elevation_gain_m": 198,
      "difficulty": "moderate",
      "route_type": "out_and_back",
      "rating": 4.8,
      "reviews_count": 1240,
      "description": "Scenic alpine ridge trail with panoramic views.",
    },
    retrieved_at="2026-09-14T00:00:00Z",
  )

  draft = draft_facts_from_documents([doc])
  assert draft is not None

  facts = verify_facts(draft, [doc], category="hike")
  assert facts.website_url == "https://www.alltrails.com/trail/us/washington/hurricane-hill-via-hurricane-ridge-trail"
  assert facts.distance_km == 5.15
  assert facts.elevation_gain_m == 198
  assert facts.difficulty == "moderate"
  assert facts.route_type == "out_and_back"
  assert facts.rating == 4.8
  assert facts.reviews_count == 1240
  assert facts.famous_for == "Scenic alpine ridge trail with panoramic views."
