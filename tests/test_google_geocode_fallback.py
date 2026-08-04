from unittest.mock import patch

from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.clients.google_geocode import (
  geocode_google,
  google_fallback_query,
)
from travelplanner.feature_flag import FeatureFlag
from travelplanner.place_hints import PlaceMention
from travelplanner.places.locate import geocode_queries, locate_mention_debug


def test_google_fallback_query_includes_category_once() -> None:
  assert google_fallback_query(
    "Hule",
    city="Mexico City",
    country="Mexico",
    category="cafe",
  ) == "Hule, cafe, Mexico City, Mexico"


def test_geocode_queries_adds_honorific_and_category_variants() -> None:
  mention = PlaceMention(
    place_name="Sr. Croissant",
    city="Mexico City",
    country="Mexico",
    category="cafe",
  )
  queries = geocode_queries(mention)
  assert "Sr. Croissant cafe, Mexico City, Mexico" in queries
  assert "Croissant, Mexico City, Mexico" in queries


def test_geocode_google_uses_places_when_geocode_empty(monkeypatch) -> None:
  monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "test-key")

  def fake_get(url: str, *, timeout: int = 20):
    return {"status": "ZERO_RESULTS", "results": []}

  def fake_post(url: str, body: dict, *, headers: dict, timeout: int = 20):
    assert "searchText" in url
    assert headers["X-Goog-FieldMask"].startswith("places.id")
    assert "rating" not in headers["X-Goog-FieldMask"]
    return {
      "places": [
        {
          "id": "places/ChIJtest",
          "displayName": {"text": "Quiasmo"},
          "formattedAddress": "Roma Nte., Mexico City, Mexico",
          "location": {"latitude": 19.42, "longitude": -99.16},
          "types": ["cafe", "food", "point_of_interest"],
        }
      ]
    }

  with (
    patch("travelplanner.clients.google_geocode._http_get_json", side_effect=fake_get),
    patch("travelplanner.clients.google_geocode._http_post_json", side_effect=fake_post),
  ):
    hits = geocode_google("Quiasmo, cafe, Mexico City, Mexico", fallback_name="Quiasmo")

  assert len(hits) == 1
  assert hits[0].provider == "google"
  assert hits[0].display_name == "Quiasmo"
  assert hits[0].osm_class == "amenity"
  assert hits[0].osm_type == "cafe"


def test_geocode_google_skips_street_address_and_falls_through(monkeypatch) -> None:
  monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "test-key")
  places_called = {"n": 0}

  def fake_get(url: str, *, timeout: int = 20):
    return {
      "status": "OK",
      "results": [
        {
          "place_id": "addr1",
          "types": ["street_address"],
          "formatted_address": "Hule St, Mexico City",
          "geometry": {"location": {"lat": 19.4, "lng": -99.1}},
          "address_components": [],
        }
      ],
    }

  def fake_post(url: str, body: dict, *, headers: dict, timeout: int = 20):
    places_called["n"] += 1
    return {
      "places": [
        {
          "id": "places/hule",
          "displayName": {"text": "Hule"},
          "formattedAddress": "Mexico City, Mexico",
          "location": {"latitude": 19.41, "longitude": -99.17},
          "types": ["cafe"],
        }
      ]
    }

  with (
    patch("travelplanner.clients.google_geocode._http_get_json", side_effect=fake_get),
    patch("travelplanner.clients.google_geocode._http_post_json", side_effect=fake_post),
  ):
    hits = geocode_google("Hule, Mexico City, Mexico", fallback_name="Hule")

  assert places_called["n"] == 1
  assert hits[0].display_name == "Hule"


def test_locate_skips_google_when_flag_off(monkeypatch) -> None:
  mention = PlaceMention(place_name="Quiasmo", city="Mexico City", country="Mexico")

  monkeypatch.setattr(
    "travelplanner.places.locate._collect_forward_candidates",
    lambda *a, **k: [],
  )
  with patch("travelplanner.places.locate.geocode_google") as mock_google:
    result = locate_mention_debug(mention)
  mock_google.assert_not_called()
  assert result.status == "unresolved"


def test_locate_uses_google_when_nominatim_empty(monkeypatch) -> None:
  mention = PlaceMention(
    place_name="Quiasmo",
    city="Mexico City",
    country="Mexico",
    category="cafe",
  )
  google_hit = GeocodeResult(
    display_name="Quiasmo",
    latitude=19.42,
    longitude=-99.16,
    country="Mexico",
    country_code="MX",
    city="Mexico City",
    category="food",
    provider="google",
    osm_class="amenity",
    osm_type="cafe",
  )

  monkeypatch.setattr(
    "travelplanner.places.locate._collect_forward_candidates",
    lambda *a, **k: [],
  )
  monkeypatch.setattr(
    "travelplanner.places.locate._parent_anchor",
    lambda *a, **k: (19.43, -99.13),
  )

  try:
    FeatureFlag.set("google_geocode_fallback", True)
    with patch(
      "travelplanner.places.locate.geocode_google",
      return_value=[google_hit],
    ) as mock_google:
      result = locate_mention_debug(mention)
    mock_google.assert_called_once()
    assert result.status in {"resolved", "low_confidence"}
    assert result.location is not None
    assert result.location.display_name == "Quiasmo"
  finally:
    FeatureFlag.set("google_geocode_fallback", False)
