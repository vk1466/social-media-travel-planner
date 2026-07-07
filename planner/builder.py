from collections import defaultdict

from common.models import Itinerary, ItineraryDay, Place, TravelPost


def _group_posts_by_city(posts: list[TravelPost]) -> dict[str, list[TravelPost]]:
  grouped: dict[str, list[TravelPost]] = defaultdict(list)
  for post in posts:
    place = post.primary_place
    if place is None:
      continue
    city_key = place.city or place.country or "Unknown"
    grouped[city_key].append(post)
  return dict(grouped)


def build_itinerary(
  posts: list[TravelPost],
  *,
  trip_name: str,
  destination: str | None = None,
  places_per_day: int = 3,
) -> Itinerary:
  """
  Build a simple day-by-day itinerary from travel posts.

  Groups posts by city, then chunks places into days.
  """
  if not posts:
    raise ValueError("At least one travel post is required")

  resolved_destination = destination
  if resolved_destination is None:
    first_place = next((post.primary_place for post in posts if post.primary_place), None)
    resolved_destination = first_place.city if first_place and first_place.city else "Trip"

  itinerary = Itinerary(trip_name=trip_name, destination=resolved_destination)

  posts_by_city = _group_posts_by_city(posts)
  day_number = 1

  for city, city_posts in posts_by_city.items():
    places: list[Place] = []
    source_urls: list[str] = []

    for post in city_posts:
      for place in post.places:
        places.append(place)
        source_urls.append(post.post_url)

    for chunk_start in range(0, len(places), places_per_day):
      chunk_places = places[chunk_start : chunk_start + places_per_day]
      chunk_urls = source_urls[chunk_start : chunk_start + places_per_day]
      itinerary.add_day(
        ItineraryDay(
          day_number=day_number,
          title=f"Day {day_number}: {city}",
          places=tuple(chunk_places),
          source_post_urls=tuple(chunk_urls),
        )
      )
      day_number += 1

  return itinerary
