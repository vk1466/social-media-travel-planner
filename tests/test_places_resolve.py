from travelplanner.models import Place, PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import save_place
from travelplanner.places.resolve import find_existing_place


def test_find_existing_place_requires_name_for_near_dup(dynamodb) -> None:
  nearby = Place(
    place_id="us-oregon-parking-lot",
    display_name="Smith Rock Parking Lot",
    location=PlaceLocation(
      display_name="Smith Rock Parking Lot",
      country_code="US",
      state_province="Oregon",
      latitude=45.0,
      longitude=-122.0,
    ),
  )
  save_place(nearby)

  mention = PlaceMention(place_name="Misery Ridge Trail")
  location = PlaceLocation(
    display_name="Misery Ridge Trail",
    country_code="US",
    state_province="Oregon",
    latitude=45.0001,
    longitude=-122.0001,
  )
  assert find_existing_place("other-key", location, mention, library=[nearby]) is None


def test_find_existing_place_merges_compatible_near_dup(dynamodb) -> None:
  existing = Place(
    place_id="us-oregon-misery-ridge",
    display_name="Misery Ridge",
    location=PlaceLocation(
      display_name="Misery Ridge",
      country_code="US",
      state_province="Oregon",
      latitude=44.36,
      longitude=-121.14,
    ),
    aliases=("Misery Ridge Trail",),
  )
  save_place(existing)

  mention = PlaceMention(place_name="Misery Ridge Trail")
  location = PlaceLocation(
    display_name="Misery Ridge Trail",
    country_code="US",
    state_province="Oregon",
    latitude=44.3602,
    longitude=-121.1402,
  )
  found = find_existing_place("other-key", location, mention, library=[existing])
  assert found is not None
  assert found.place_id == existing.place_id
