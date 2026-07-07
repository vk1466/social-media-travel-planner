from common.fixtures import sample_tokyo_posts
from planner.builder import build_itinerary


def test_build_itinerary_from_fixture():
  itinerary = build_itinerary(sample_tokyo_posts(), trip_name="Tokyo")
  assert itinerary.place_count == 3
  assert len(itinerary.days) >= 1
