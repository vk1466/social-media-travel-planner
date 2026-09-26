from travelplanner.models import Place, PlaceLocation
from travelplanner.places.nearby import place_is_nearby, place_is_tourist_destination

LISBON = (38.7223, -9.1393)


def _place(name: str, lat: float | None, lng: float | None) -> Place:
  return Place(
    place_id=name.lower(),
    display_name=name,
    location=PlaceLocation(display_name=name, latitude=lat, longitude=lng),
  )


def test_day_trip_is_kept_and_far_city_is_not() -> None:
  sintra = _place("Sintra", 38.8029, -9.3817)
  porto = _place("Porto", 41.1579, -8.6291)
  assert place_is_nearby(sintra, latitude=LISBON[0], longitude=LISBON[1], radius_km=150)
  assert not place_is_nearby(porto, latitude=LISBON[0], longitude=LISBON[1], radius_km=150)


def test_only_sights_count_as_tourist_destinations() -> None:
  palace = _place("Pena Palace", 38.78, -9.39)
  palace = Place(
    place_id=palace.place_id,
    display_name=palace.display_name,
    location=palace.location,
    category="landmark",
  )
  cafe = Place(
    place_id="cafe",
    display_name="Cafe",
    location=palace.location,
    category="cafe",
  )
  city = Place(
    place_id="lisbon",
    display_name="Lisbon",
    location=palace.location,
    category="city",
  )
  assert place_is_tourist_destination(palace)
  assert not place_is_tourist_destination(cafe)
  assert not place_is_tourist_destination(city)
  assert not place_is_tourist_destination(_place("Unknown", 38.7, -9.1))


def test_place_without_coordinates_is_rejected() -> None:
  unnamed = _place("Somewhere", None, None)
  assert not place_is_nearby(unnamed, latitude=LISBON[0], longitude=LISBON[1], radius_km=150)
