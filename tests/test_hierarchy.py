from __future__ import annotations

import json

from travelplanner.extract import fetch_places_from_text
from travelplanner.hierarchy import choose_group_name, link_places
from travelplanner.models import PlaceLocation, Platform, SavedPost, make_post_id
from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace
from travelplanner.places import (
  is_visitable_place,
  load_all_places,
  load_place,
  process_post_places,
  upsert_place,
)
from travelplanner.store import save_post


def _sample_post(
  *,
  places=(),
  extracted_places=(),
  place_ids=(),
  post_id: str = "instagram:post1",
) -> SavedPost:
  native_id = post_id.split(":", 1)[-1]
  return SavedPost(
    post_id=post_id if ":" in post_id else make_post_id(Platform.INSTAGRAM, post_id),
    post_url=f"https://www.instagram.com/p/{native_id}/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="a trip",
    places=places,
    extracted_places=extracted_places,
    place_ids=place_ids,
    fetched_at="2026-07-06T21:15:04Z",
  )


def _crater_lake_location(*, display_name: str = "Crater Lake", lat: float = 42.9446, lon: float = -122.1090) -> PlaceLocation:
  return PlaceLocation(
    display_name=display_name,
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Klamath County",
    latitude=lat,
    longitude=lon,
    osm_class="natural",
    osm_type="water",
  )


def test_is_visitable_place_rejects_non_travel_offices() -> None:
  remax = PlaceLocation(
    display_name="Brookings Oregon Real Estate - Remax Coast and Country",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Brookings",
    osm_class="office",
    osm_type="estate_agent",
  )
  assert is_visitable_place(remax) is False


def test_is_visitable_place_rejects_administrative_regions() -> None:
  oregon = PlaceLocation(
    display_name="Oregon",
    country="United States",
    country_code="US",
    state_province="Oregon",
    osm_class="boundary",
    osm_type="administrative",
  )
  assert is_visitable_place(oregon) is False

  state_only = PlaceLocation(display_name="Oregon", state_province="Oregon", osm_type="state")
  assert is_visitable_place(state_only) is False

  country_only = PlaceLocation(display_name="United States", country="United States", osm_type="country")
  assert is_visitable_place(country_only) is False

  falls = _crater_lake_location()
  assert is_visitable_place(falls) is True


def test_process_post_places_skips_non_visitable_admin_regions(monkeypatch, tmp_path) -> None:
  post = _sample_post(extracted_places=(ExtractedPlace(place_name="Oregon", state_province="Oregon"),))
  admin_location = PlaceLocation(
    display_name="Oregon",
    country="United States",
    country_code="US",
    state_province="Oregon",
    osm_class="boundary",
    osm_type="administrative",
  )
  monkeypatch.setattr("travelplanner.places.locate_mention", lambda mention: admin_location)

  place_ids = process_post_places(post, places_data_dir=tmp_path)

  assert place_ids == ()
  assert load_all_places(data_dir=tmp_path) == []


def test_fetch_places_from_text_returns_empty_without_api_key(monkeypatch) -> None:
  monkeypatch.setattr("travelplanner.settings.openai_api_key", lambda: None)
  assert fetch_places_from_text("Day 1: Emerald Bay\nDay 2: Sand Harbor") == ()


def test_fetch_places_from_text_parses_structured_response(monkeypatch) -> None:
  payload = {
    "reel_summary": "A Lake Tahoe loop with overlooks and a gondola ride.",
    "places": [
      {
        "place_name": "Emerald Bay",
        "state_province": "California",
        "country": "USA",
        "parent_place_name": "Lake Tahoe",
        "tags": ["viewpoint"],
      },
      {"place_name": "Sand Harbor", "parent_place_name": "Lake Tahoe"},
      {"place_name": "Heavenly Gondola", "parent_place_name": "Lake Tahoe"},
    ]
  }

  class FakeMessage:
    content = json.dumps(payload)

  class FakeChoice:
    message = FakeMessage()

  class FakeResponse:
    choices = [FakeChoice()]

  class FakeCompletions:
    def create(self, **kwargs):
      return FakeResponse()

  class FakeChat:
    completions = FakeCompletions()

  class FakeClient:
    chat = FakeChat()

  monkeypatch.setattr("travelplanner.settings.openai_api_key", lambda: "test-key")
  monkeypatch.setattr("travelplanner.clients.openai.get_client", lambda: FakeClient())

  places = fetch_places_from_text("📍 Emerald Bay\n📍 Sand Harbor\n📍 Heavenly Gondola")
  assert len(places) == 3
  assert places[0].place_name == "Emerald Bay"
  assert places[0].parent_place_name == "Lake Tahoe"


def test_choose_group_name_returns_none_without_client(monkeypatch) -> None:
  monkeypatch.setattr("travelplanner.hierarchy.get_client", lambda: None)
  assert choose_group_name(("Crater Lake Parkway", "Rim Village")) is None


def test_link_places_ig_tag_anchor_clusters_post_places(monkeypatch, tmp_path) -> None:
  posts_dir = tmp_path / "posts"
  places_dir = tmp_path / "places"

  lake = upsert_place(
    PlaceMention(place_name="Lake Tahoe"),
    PlaceLocation(
      display_name="Lake Tahoe",
      country_code="US",
      state_province="California",
      latitude=39.0968,
      longitude=-120.0324,
    ),
    "instagram:post1",
    data_dir=places_dir,
  )
  emerald = upsert_place(
    PlaceMention(place_name="Emerald Bay"),
    PlaceLocation(
      display_name="Emerald Bay",
      country_code="US",
      state_province="California",
      latitude=39.0170,
      longitude=-120.0980,
    ),
    "instagram:post1",
    data_dir=places_dir,
  )

  post = _sample_post(
    places=(PlatformPlace(place_name="Lake Tahoe", latitude=39.0968, longitude=-120.0324),),
    extracted_places=(ExtractedPlace(place_name="Emerald Bay", parent_place_name="Lake Tahoe"),),
    place_ids=(lake, emerald),
    post_id="instagram:post1",
  )
  save_post(post, data_dir=posts_dir)

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: "Lake Tahoe")
  link_places(posts_data_dir=posts_dir, places_data_dir=places_dir)

  root = load_place(lake, data_dir=places_dir)
  child = load_place(emerald, data_dir=places_dir)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == lake


def test_link_places_parent_hint_wins_over_shorter_child_name(monkeypatch, tmp_path) -> None:
  posts_dir = tmp_path / "posts"
  places_dir = tmp_path / "places"

  park = upsert_place(
    PlaceMention(place_name="Smith Rock State Park", tags=("park",)),
    PlaceLocation(
      display_name="Smith Rock State Park",
      country_code="US",
      state_province="Oregon",
      latitude=44.3665,
      longitude=-121.1408,
    ),
    "instagram:post1",
    data_dir=places_dir,
  )
  trail = upsert_place(
    PlaceMention(place_name="Misery Ridge Trail", tags=("hike",)),
    PlaceLocation(
      display_name="Misery Ridge Trail",
      country_code="US",
      state_province="Oregon",
      latitude=44.3670,
      longitude=-121.1410,
    ),
    "instagram:post1",
    data_dir=places_dir,
  )

  post = _sample_post(
    extracted_places=(
      ExtractedPlace(
        place_name="Misery Ridge Trail",
        state_province="Oregon",
        country="USA",
        parent_place_name="Smith Rock State Park",
        tags=("hike",),
      ),
    ),
    place_ids=(park, trail),
    post_id="instagram:post1",
  )
  save_post(post, data_dir=posts_dir)

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: None)
  link_places(posts_data_dir=posts_dir, places_data_dir=places_dir)

  root = load_place(park, data_dir=places_dir)
  child = load_place(trail, data_dir=places_dir)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == park


def test_link_places_cross_post_name_proximity_cluster(monkeypatch, tmp_path) -> None:
  posts_dir = tmp_path / "posts"
  places_dir = tmp_path / "places"

  crater = upsert_place(
    PlaceMention(place_name="Crater Lake"),
    _crater_lake_location(),
    "instagram:postA",
    data_dir=places_dir,
  )
  parkway = upsert_place(
    PlaceMention(place_name="Crater Lake Parkway"),
    _crater_lake_location(display_name="Crater Lake Parkway", lat=42.9450, lon=-122.1085),
    "instagram:postB",
    data_dir=places_dir,
  )

  save_post(
    _sample_post(extracted_places=(ExtractedPlace(place_name="Crater Lake"),), place_ids=(crater,), post_id="instagram:postA"),
    data_dir=posts_dir,
  )
  save_post(
    _sample_post(
      extracted_places=(ExtractedPlace(place_name="Crater Lake Parkway"),),
      place_ids=(parkway,),
      post_id="instagram:postB",
    ),
    data_dir=posts_dir,
  )

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: "Crater Lake")
  link_places(posts_data_dir=posts_dir, places_data_dir=places_dir)

  root = load_place(crater, data_dir=places_dir)
  child = load_place(parkway, data_dir=places_dir)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == crater


def test_link_places_renames_root_when_group_name_has_no_member_match(monkeypatch, tmp_path) -> None:
  places_dir = tmp_path / "places"
  posts_dir = tmp_path / "posts"

  parkway = upsert_place(
    PlaceMention(place_name="Crater Lake Parkway"),
    _crater_lake_location(display_name="Crater Lake Parkway"),
    "instagram:postB",
    data_dir=places_dir,
  )
  rim = upsert_place(
    PlaceMention(place_name="Rim Village"),
    _crater_lake_location(display_name="Rim Village", lat=42.9460, lon=-122.1070),
    "instagram:postB",
    data_dir=places_dir,
  )

  save_post(
    _sample_post(
      places=(PlatformPlace(place_name="Crater Lake Parkway"),),
      place_ids=(parkway, rim),
      post_id="instagram:postB",
    ),
    data_dir=posts_dir,
  )

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: "Crater Lake")
  link_places(posts_data_dir=posts_dir, places_data_dir=places_dir)

  root = load_place(rim, data_dir=places_dir)
  child = load_place(parkway, data_dir=places_dir)
  assert root is not None and child is not None
  assert root.display_name == "Crater Lake"
  assert "Rim Village" in root.aliases
  assert child.parent_place_id == rim


def test_link_places_is_idempotent(monkeypatch, tmp_path) -> None:
  posts_dir = tmp_path / "posts"
  places_dir = tmp_path / "places"

  crater = upsert_place(
    PlaceMention(place_name="Crater Lake"),
    _crater_lake_location(),
    "instagram:postA",
    data_dir=places_dir,
  )
  parkway = upsert_place(
    PlaceMention(place_name="Crater Lake Parkway"),
    _crater_lake_location(display_name="Crater Lake Parkway", lat=42.9450, lon=-122.1085),
    "instagram:postB",
    data_dir=places_dir,
  )
  save_post(_sample_post(place_ids=(crater,), post_id="instagram:postA"), data_dir=posts_dir)
  save_post(_sample_post(place_ids=(parkway,), post_id="instagram:postB"), data_dir=posts_dir)

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: None)
  link_places(posts_data_dir=posts_dir, places_data_dir=places_dir)
  first = {place.place_id: place for place in load_all_places(data_dir=places_dir)}

  link_places(posts_data_dir=posts_dir, places_data_dir=places_dir)
  second = {place.place_id: place for place in load_all_places(data_dir=places_dir)}

  assert first == second


def test_backward_compat_place_json_without_new_fields(tmp_path) -> None:
  legacy = {
    "place_id": "us-or-klamath-crater-lake",
    "display_name": "Crater Lake",
    "location": {
      "display_name": "Crater Lake",
      "country_code": "US",
      "state_province": "Oregon",
    },
    "aliases": [],
    "tags": [],
    "details": [],
    "tips": [],
    "source_post_ids": ["instagram:abc"],
  }
  path = tmp_path / "us-or-klamath-crater-lake.json"
  path.write_text(json.dumps(legacy), encoding="utf-8")

  place = load_place("us-or-klamath-crater-lake", data_dir=tmp_path)
  assert place is not None
  assert place.parent_place_id is None
  assert place.location.osm_class is None
