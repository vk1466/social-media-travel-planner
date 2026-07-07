"""Sanity check: build an itinerary from sample Tokyo posts."""
from common.fixtures import sample_tokyo_posts
from planner.builder import build_itinerary

posts = sample_tokyo_posts()
itinerary = build_itinerary(posts, trip_name="Tokyo Food & Culture")

assert itinerary.destination == "Tokyo"
assert itinerary.place_count == 3
assert len(itinerary.days) == 1
assert itinerary.days[0].title == "Day 1: Tokyo"

print("OK")
print("trip:", itinerary.trip_name)
print("destination:", itinerary.destination)
print("days:", len(itinerary.days))
for day in itinerary.days:
  print(f"  {day.title}")
  for place in day.places:
    print(f"    - {place.formatted_location}")
