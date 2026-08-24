from travelplanner.models import PlaceLocation
from travelplanner.places.maps import google_maps_url_for_location


def test_url_uses_name_and_admin_hierarchy() -> None:
  url = google_maps_url_for_location(
    PlaceLocation(
      display_name="Spork",
      city="Bend",
      state_province="Oregon",
      country="United States",
      latitude=44.0622,
      longitude=-121.3259,
      provider_place_id="326921414",
    )
  )
  assert url == (
    "https://www.google.com/maps/search/?api=1"
    "&query=Spork%2C%20Bend%2C%20Oregon%2C%20United%20States"
  )


def test_url_pins_google_place_id() -> None:
  url = google_maps_url_for_location(
    PlaceLocation(
      display_name="Hule",
      city="Colonia Condesa",
      state_province="Ciudad de México",
      country="Mexico",
      provider_place_id="ChIJ7fgnydb_0YURKeESqB1x7YA",
    )
  )
  assert url is not None
  assert "query_place_id=ChIJ7fgnydb_0YURKeESqB1x7YA" in url
  assert "Hule" in url


def test_url_falls_back_to_coordinates() -> None:
  url = google_maps_url_for_location(
    PlaceLocation(display_name="", latitude=51.4881335, longitude=-115.9380498)
  )
  assert url == "https://www.google.com/maps/search/?api=1&query=51.4881335%2C-115.9380498"


def test_osm_and_overpass_ids_are_not_query_place_id() -> None:
  osm = google_maps_url_for_location(
    PlaceLocation(display_name="Banff National Park", country="Canada", provider_place_id="376707922")
  )
  overpass = google_maps_url_for_location(
    PlaceLocation(display_name="Trail", country="Canada", provider_place_id="overpass:way:1")
  )
  assert osm is not None and "query_place_id" not in osm
  assert overpass is not None and "query_place_id" not in overpass
