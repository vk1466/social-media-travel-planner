from travelplanner.models import Place, PlaceLocation
from travelplanner.places.nearby import place_is_nearby

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


def test_place_without_coordinates_is_rejected() -> None:
  unnamed = _place("Somewhere", None, None)
  assert not place_is_nearby(unnamed, latitude=LISBON[0], longitude=LISBON[1], radius_km=150)
