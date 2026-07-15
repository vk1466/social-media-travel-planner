from __future__ import annotations

import json

from travelplanner.extract import fetch_places_from_text
from travelplanner.hierarchy import choose_group_name, link_places
from travelplanner.models import PlaceLocation, Platform, SavedPost, make_post_id
from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace
from travelplanner.places import (
  LocateDebugResult,
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


def test_process_post_places_skips_non_visitable_admin_regions(monkeypatch, dynamodb) -> None:
  post = _sample_post(extracted_places=(ExtractedPlace(place_name="Oregon", state_province="Oregon"),))
  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention, **_: LocateDebugResult(status="unresolved", notes=("rejected admin",)),
  )

  place_ids = process_post_places(post)

  assert place_ids == ()
  assert load_all_places() == []


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
        "category": "viewpoint", "attributes": [],
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


def test_link_places_ig_tag_anchor_clusters_post_places(monkeypatch, dynamodb) -> None:

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
  )

  post = _sample_post(
    places=(PlatformPlace(place_name="Lake Tahoe", latitude=39.0968, longitude=-120.0324),),
    extracted_places=(ExtractedPlace(place_name="Emerald Bay", parent_place_name="Lake Tahoe"),),
    place_ids=(lake, emerald),
    post_id="instagram:post1",
  )
  save_post(post)

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: "Lake Tahoe")
  link_places()

  root = load_place(lake)
  child = load_place(emerald)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == lake


def test_link_places_parent_hint_wins_over_shorter_child_name(monkeypatch, dynamodb) -> None:

  park = upsert_place(
    PlaceMention(place_name="Smith Rock State Park", category="park"),
    PlaceLocation(
      display_name="Smith Rock State Park",
      country_code="US",
      state_province="Oregon",
      latitude=44.3665,
      longitude=-121.1408,
    ),
    "instagram:post1",
  )
  trail = upsert_place(
    PlaceMention(place_name="Misery Ridge Trail", category="hike"),
    PlaceLocation(
      display_name="Misery Ridge Trail",
      country_code="US",
      state_province="Oregon",
      latitude=44.3670,
      longitude=-121.1410,
    ),
    "instagram:post1",
  )

  post = _sample_post(
    extracted_places=(
      ExtractedPlace(
        place_name="Misery Ridge Trail",
        state_province="Oregon",
        country="USA",
        parent_place_name="Smith Rock State Park",
        category="hike",
      ),
    ),
    place_ids=(park, trail),
    post_id="instagram:post1",
  )
  save_post(post)

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: None)
  link_places()

  root = load_place(park)
  child = load_place(trail)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == park


def test_link_places_cross_post_name_proximity_cluster(monkeypatch, dynamodb) -> None:

  crater = upsert_place(
    PlaceMention(place_name="Crater Lake"),
    _crater_lake_location(),
    "instagram:postA",
  )
  # Broader-name match for hierarchy, but not alias/near-dup merge in resolve.
  visitor = upsert_place(
    PlaceMention(place_name="Crater Lake Visitor Center"),
    _crater_lake_location(
      display_name="Crater Lake Visitor Center",
      lat=42.9600,
      lon=-122.0900,
    ),
    "instagram:postB",
  )

  save_post(
    _sample_post(extracted_places=(ExtractedPlace(place_name="Crater Lake"),), place_ids=(crater,), post_id="instagram:postA"),
  )
  save_post(
    _sample_post(
      extracted_places=(ExtractedPlace(place_name="Crater Lake Visitor Center"),),
      place_ids=(visitor,),
      post_id="instagram:postB",
    ),
  )

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: "Crater Lake")
  link_places()

  root = load_place(crater)
  child = load_place(visitor)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == crater


def test_link_places_renames_root_when_group_name_has_no_member_match(monkeypatch, dynamodb) -> None:

  parkway = upsert_place(
    PlaceMention(place_name="Crater Lake Parkway"),
    _crater_lake_location(display_name="Crater Lake Parkway"),
    "instagram:postB",
  )
  rim = upsert_place(
    PlaceMention(place_name="Rim Village"),
    _crater_lake_location(display_name="Rim Village", lat=42.9460, lon=-122.1070),
    "instagram:postB",
  )

  save_post(
    _sample_post(
      places=(PlatformPlace(place_name="Crater Lake Parkway"),),
      place_ids=(parkway, rim),
      post_id="instagram:postB",
    ),
  )

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: "Crater Lake")
  link_places()

  root = load_place(rim)
  child = load_place(parkway)
  assert root is not None and child is not None
  assert root.display_name == "Crater Lake"
  assert "Rim Village" in root.aliases
  assert child.parent_place_id == rim


def test_link_places_is_idempotent(monkeypatch, dynamodb) -> None:

  crater = upsert_place(
    PlaceMention(place_name="Crater Lake"),
    _crater_lake_location(),
    "instagram:postA",
  )
  parkway = upsert_place(
    PlaceMention(place_name="Crater Lake Parkway"),
    _crater_lake_location(display_name="Crater Lake Parkway", lat=42.9450, lon=-122.1085),
    "instagram:postB",
  )
  save_post(_sample_post(place_ids=(crater,), post_id="instagram:postA"))
  save_post(_sample_post(place_ids=(parkway,), post_id="instagram:postB"))

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: None)
  link_places()
  first = {place.place_id: place for place in load_all_places()}

  link_places()
  second = {place.place_id: place for place in load_all_places()}

  assert first == second


def test_backward_compat_place_without_new_fields(dynamodb) -> None:
  from travelplanner.db.places_repo import place_from_dict, save_place

  legacy = {
    "place_id": "us-or-klamath-crater-lake",
    "display_name": "Crater Lake",
    "location": {
      "display_name": "Crater Lake",
      "country_code": "US",
      "state_province": "Oregon",
      "city": "Klamath Falls",
      "latitude": 42.9446,
      "longitude": -122.1090,
    },
    "aliases": [],
    "details": [],
    "tips": [],
    "source_post_ids": [],
  }
  save_place(place_from_dict(legacy))

  place = load_place("us-or-klamath-crater-lake")
  assert place is not None
  assert place.parent_place_id is None
  assert place.location.osm_class is None


def test_link_places_category_prefers_park_over_hike_without_hint(monkeypatch, dynamodb) -> None:
  park = upsert_place(
    PlaceMention(place_name="Smith Rock State Park", category="park"),
    PlaceLocation(
      display_name="Smith Rock State Park",
      country_code="US",
      state_province="Oregon",
      latitude=44.3665,
      longitude=-121.1408,
    ),
    "instagram:post1",
  )
  trail = upsert_place(
    PlaceMention(place_name="Misery Ridge", category="hike"),
    PlaceLocation(
      display_name="Misery Ridge",
      country_code="US",
      state_province="Oregon",
      latitude=44.3670,
      longitude=-121.1410,
    ),
    "instagram:post1",
  )

  # Same post IG-tag cluster, no parent_place_name hint.
  save_post(
    _sample_post(
      places=(PlatformPlace(place_name="Smith Rock State Park"),),
      place_ids=(park, trail),
      post_id="instagram:post1",
    ),
  )

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: None)
  link_places()

  root = load_place(park)
  child = load_place(trail)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == park


def test_link_places_category_prefers_neighborhood_over_landmark(monkeypatch, dynamodb) -> None:
  gastown = upsert_place(
    PlaceMention(place_name="Gastown", category="neighborhood"),
    PlaceLocation(
      display_name="Gastown",
      country_code="CA",
      state_province="British Columbia",
      latitude=49.2840,
      longitude=-123.1090,
    ),
    "instagram:post1",
  )
  clock = upsert_place(
    PlaceMention(place_name="Steam Clock", category="landmark"),
    PlaceLocation(
      display_name="Steam Clock",
      country_code="CA",
      state_province="British Columbia",
      latitude=49.2845,
      longitude=-123.1087,
    ),
    "instagram:post1",
  )

  save_post(
    _sample_post(
      places=(PlatformPlace(place_name="Gastown"),),
      place_ids=(gastown, clock),
      post_id="instagram:post1",
    ),
  )

  monkeypatch.setattr(
    "travelplanner.hierarchy.choose_group_name",
    lambda names: "Steam Clock",
  )
  link_places()

  root = load_place(gastown)
  child = load_place(clock)
  assert root is not None and child is not None
  assert root.parent_place_id is None
  assert child.parent_place_id == gastown
  assert root.display_name == "Gastown"


def test_link_places_all_hikes_still_elects_a_root(monkeypatch, dynamodb) -> None:
  left = upsert_place(
    PlaceMention(place_name="Misery Ridge Trail", category="hike"),
    PlaceLocation(
      display_name="Misery Ridge Trail",
      country_code="US",
      state_province="Oregon",
      latitude=44.3670,
      longitude=-121.1410,
    ),
    "instagram:post1",
  )
  right = upsert_place(
    PlaceMention(place_name="Monkey Face Trail", category="hike"),
    PlaceLocation(
      display_name="Monkey Face Trail",
      country_code="US",
      state_province="Oregon",
      latitude=44.3680,
      longitude=-121.1420,
    ),
    "instagram:post1",
  )

  save_post(
    _sample_post(
      places=(PlatformPlace(place_name="Misery Ridge Trail"),),
      place_ids=(left, right),
      post_id="instagram:post1",
    ),
  )

  monkeypatch.setattr("travelplanner.hierarchy.choose_group_name", lambda names: None)
  link_places()

  places = {place.place_id: place for place in load_all_places()}
  roots = [place for place in places.values() if place.parent_place_id is None]
  children = [place for place in places.values() if place.parent_place_id is not None]
  assert len(roots) == 1
  assert len(children) == 1
  assert children[0].parent_place_id == roots[0].place_id


