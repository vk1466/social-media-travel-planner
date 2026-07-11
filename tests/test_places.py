from types import SimpleNamespace

from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace
from travelplanner.places import (
  _geocode_queries,
  cleanup_all_data,
  delete_all_places,
  is_visitable_place,
  list_places,
  load_all_places,
  load_place,
  locate_mention,
  mentions_from_post,
  place_key,
  process_post_places,
  reprocess_all_places,
  slugify,
  upsert_place,
)
from travelplanner.store import delete_all_posts, save_post


def _fake_location(latitude: float, longitude: float, raw: dict) -> SimpleNamespace:
  return SimpleNamespace(latitude=latitude, longitude=longitude, raw=raw)


def _multnomah_falls_raw() -> dict:
  return {
    "place_id": 12345,
    "name": "Multnomah Falls",
    "display_name": "Multnomah Falls, Multnomah County, Oregon, United States",
    "address": {
      "city": "Portland",
      "state": "Oregon",
      "country": "United States",
      "country_code": "us",
    },
  }


def _sample_post(*, places=(), extracted_places=(), post_id: str = "instagram:post1") -> SavedPost:
  native_id = post_id.split(":", 1)[-1]
  return SavedPost(
    post_id=post_id if ":" in post_id else f"instagram:{post_id}",
    post_url=f"https://www.instagram.com/p/{native_id}/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="a trip",
    places=places,
    extracted_places=extracted_places,
    fetched_at="2026-07-06T21:15:04Z",
  )


def test_slugify_normalizes_accents_and_punctuation() -> None:
  assert slugify("Águas Claras!") == "aguas-claras"
  assert slugify("  Multnomah   Falls ") == "multnomah-falls"
  assert slugify(None) == ""
  assert slugify("") == ""


def test_place_key_builds_from_hierarchy() -> None:
  location = PlaceLocation(
    display_name="Multnomah Falls",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  assert place_key(location) == "us-oregon-portland-multnomah-falls"


def test_mentions_from_post_normalizes_both_hint_shapes() -> None:
  post = _sample_post(
    places=(
      PlatformPlace(place_name="Alfama", city="Lisbon", country="Portugal", latitude=38.7131, longitude=-9.1279),
    ),
    extracted_places=(
      ExtractedPlace(
        place_name="Belem Tower",
        city="Lisbon",
        country="Portugal",
        state_province="Lisbon District",
        details="Historic tower",
        tips=("Go early",),
        tags=("landmark",),
      ),
    ),
  )

  mentions = mentions_from_post(post)
  assert mentions == (
    PlaceMention(
      place_name="Alfama",
      city="Lisbon",
      country="Portugal",
      latitude=38.7131,
      longitude=-9.1279,
    ),
    PlaceMention(
      place_name="Belem Tower",
      city="Lisbon",
      country="Portugal",
      state_province="Lisbon District",
      details="Historic tower",
      tips=("Go early",),
      tags=("landmark",),
    ),
  )


def test_mentions_from_post_synthesizes_parent_from_parent_place_name() -> None:
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
  )

  mentions = mentions_from_post(post)
  assert mentions == (
    PlaceMention(
      place_name="Misery Ridge Trail",
      country="USA",
      state_province="Oregon",
      tags=("hike",),
    ),
    PlaceMention(
      place_name="Smith Rock State Park",
      country="USA",
      state_province="Oregon",
    ),
  )


def test_mentions_from_post_dedupes_same_parent_across_children() -> None:
  post = _sample_post(
    extracted_places=(
      ExtractedPlace(
        place_name="Misery Ridge Trail",
        state_province="Oregon",
        country="USA",
        parent_place_name="Smith Rock State Park",
      ),
      ExtractedPlace(
        place_name="Monkey Face",
        state_province="Oregon",
        country="USA",
        parent_place_name="Smith Rock State Park",
      ),
    ),
  )

  mentions = mentions_from_post(post)
  parent_mentions = [mention for mention in mentions if mention.place_name == "Smith Rock State Park"]
  assert len(parent_mentions) == 1


def test_mentions_from_post_skips_synthesis_when_parent_already_mentioned() -> None:
  post = _sample_post(
    extracted_places=(
      ExtractedPlace(
        place_name="Smith Rock State Park",
        state_province="Oregon",
        country="USA",
        tags=("park",),
      ),
      ExtractedPlace(
        place_name="Misery Ridge Trail",
        state_province="Oregon",
        country="USA",
        parent_place_name="Smith Rock State Park",
        tags=("hike",),
      ),
    ),
  )

  mentions = mentions_from_post(post)
  park_mentions = [mention for mention in mentions if mention.place_name == "Smith Rock State Park"]
  assert len(park_mentions) == 1
  assert park_mentions[0].tags == ("park",)


def test_geocode_queries_falls_back_to_simpler_queries() -> None:
  mention = PlaceMention(
    place_name="Picture Lake",
    city="Mt. Baker",
    state_province="Washington",
    country="USA",
  )
  assert _geocode_queries(mention) == (
    "Picture Lake, Mt. Baker, Washington, USA",
    "Picture Lake, Washington, USA",
    "Picture Lake, USA",
  )


def test_locate_mention_falls_back_when_first_query_fails(monkeypatch) -> None:
  calls: list[str] = []

  def fake_geocode(query):
    calls.append(query)
    if query == "Picture Lake, Mt. Baker, Washington, USA":
      return None
    if query == "Picture Lake, Washington, USA":
      return _fake_location(48.777, -121.329, _multnomah_falls_raw())
    return None

  monkeypatch.setattr("travelplanner.places.geocoder.geocode", fake_geocode)

  mention = PlaceMention(
    place_name="Picture Lake",
    city="Mt. Baker",
    state_province="Washington",
    country="USA",
  )
  location = locate_mention(mention)

  assert calls == [
    "Picture Lake, Mt. Baker, Washington, USA",
    "Picture Lake, Washington, USA",
  ]
  assert location is not None
  assert location.display_name == "Multnomah Falls"


def test_locate_mention_falls_back_when_first_match_is_non_travel(monkeypatch) -> None:
  remax_raw = {
    "place_id": 999,
    "name": "Brookings Oregon Real Estate - Remax Coast and Country",
    "display_name": "Brookings Oregon Real Estate - Remax Coast and Country, Oregon",
    "class": "office",
    "type": "estate_agent",
    "address": {
      "city": "Brookings",
      "state": "Oregon",
      "country": "United States",
      "country_code": "us",
    },
  }
  calls: list[str] = []

  def fake_geocode(query):
    calls.append(query)
    if query == "Oregon Coast, Oregon Coast, Oregon, USA":
      return _fake_location(42.05, -124.28, remax_raw)
    if query == "Oregon Coast, Oregon, USA":
      return None
    if query == "Oregon Coast, USA":
      return None
    return None

  monkeypatch.setattr("travelplanner.places.geocoder.geocode", fake_geocode)

  mention = PlaceMention(
    place_name="Oregon Coast",
    city="Oregon Coast",
    state_province="Oregon",
    country="USA",
  )
  assert locate_mention(mention) is None
  assert calls == [
    "Oregon Coast, Oregon Coast, Oregon, USA",
    "Oregon Coast, Oregon, USA",
    "Oregon Coast, USA",
  ]


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


def test_locate_mention_uses_reverse_geocode_when_coordinates_known(monkeypatch) -> None:
  calls = {}

  def fake_reverse(latitude, longitude):
    calls["reverse"] = (latitude, longitude)
    return _fake_location(latitude, longitude, _multnomah_falls_raw())

  def fail_geocode(query):
    raise AssertionError("forward geocode should not run when coordinates are known")

  monkeypatch.setattr("travelplanner.places.geocoder.reverse_geocode", fake_reverse)
  monkeypatch.setattr("travelplanner.places.geocoder.geocode", fail_geocode)

  mention = PlaceMention(place_name="Multnomah Falls", latitude=45.5762, longitude=-122.1158)
  location = locate_mention(mention)

  assert calls["reverse"] == (45.5762, -122.1158)
  assert location == PlaceLocation(
    display_name="Multnomah Falls",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
    provider_place_id="12345",
  )


def test_locate_mention_uses_forward_geocode_when_no_coordinates(monkeypatch) -> None:
  calls = {}

  def fake_geocode(query):
    calls["query"] = query
    return _fake_location(45.5762, -122.1158, _multnomah_falls_raw())

  monkeypatch.setattr("travelplanner.places.geocoder.geocode", fake_geocode)

  mention = PlaceMention(place_name="Multnomah Falls", city="Portland", country="USA")
  location = locate_mention(mention)

  assert calls["query"] == "Multnomah Falls, Portland, USA"
  assert location is not None
  assert location.city == "Portland"


def test_locate_mention_returns_none_when_geocoder_finds_nothing(monkeypatch) -> None:
  monkeypatch.setattr("travelplanner.places.geocoder.geocode", lambda query: None)
  mention = PlaceMention(place_name="Nowhereville")
  assert locate_mention(mention) is None


def test_upsert_place_creates_new_place(dynamodb) -> None:
  mention = PlaceMention(place_name="Multnomah Falls", tags=("waterfall", "hike"), tips=("Arrive early",))
  location = PlaceLocation(
    display_name="Multnomah Falls",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )

  place_id = upsert_place(mention, location, "instagram:abc123")

  assert place_id == "us-oregon-portland-multnomah-falls"
  place = load_place(place_id)
  assert place is not None
  assert place.display_name == "Multnomah Falls"
  assert place.tags == ("hike", "waterfall")
  assert place.tips == ("Arrive early",)
  assert place.source_post_ids == ("instagram:abc123",)
  assert place.aliases == ()


def test_upsert_place_merges_into_existing_place(dynamodb) -> None:
  location = PlaceLocation(
    display_name="Multnomah Falls",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )

  first = PlaceMention(place_name="Multnomah Falls", tags=("waterfall",), tips=("Arrive early",))
  upsert_place(first, location, "instagram:abc123")

  second = PlaceMention(
    place_name="Mult Falls",
    tags=("hike",),
    tips=("Bring water", "Arrive early"),
    details="Tallest waterfall in Oregon",
  )
  place_id = upsert_place(second, location, "youtube:xyz789")

  assert place_id == "us-oregon-portland-multnomah-falls"
  places = load_all_places()
  assert len(places) == 1

  merged = places[0]
  assert merged.tags == ("hike", "waterfall")
  assert merged.tips == ("Arrive early", "Bring water")
  assert merged.aliases == ("Mult Falls",)
  assert merged.details == ("Tallest waterfall in Oregon",)
  assert merged.source_post_ids == ("instagram:abc123", "youtube:xyz789")


def test_upsert_place_merges_near_duplicate_coordinates_without_shared_key(dynamodb) -> None:
  first_location = PlaceLocation(
    display_name="Multnomah Falls",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.57620,
    longitude=-122.11580,
  )
  upsert_place(PlaceMention(place_name="Multnomah Falls"), first_location, "instagram:abc")

  # Slightly different display name -> different slug key, but coordinates are
  # within the near-duplicate radius, so it should merge into the same place.
  second_location = PlaceLocation(
    display_name="Multnomah Fall",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.57621,
    longitude=-122.11581,
  )
  place_id = upsert_place(PlaceMention(place_name="Multnomah Fall"), second_location, "youtube:xyz")

  assert place_id == "us-oregon-portland-multnomah-falls"
  assert len(load_all_places()) == 1


def test_process_post_places_skips_mentions_that_fail_to_locate(monkeypatch, dynamodb) -> None:
  post = _sample_post(places=(PlatformPlace(place_name="Nowhereville"),))
  monkeypatch.setattr("travelplanner.places.locate_mention", lambda mention: None)

  place_ids = process_post_places(post)

  assert place_ids == ()
  assert load_all_places() == []


def test_process_post_places_returns_ids_for_located_mentions(monkeypatch, dynamodb) -> None:
  post = _sample_post(
    extracted_places=(ExtractedPlace(place_name="Multnomah Falls", tags=("waterfall",)),),
  )
  location = PlaceLocation(
    display_name="Multnomah Falls",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  monkeypatch.setattr("travelplanner.places.locate_mention", lambda mention: location)

  place_ids = process_post_places(post)

  assert place_ids == ("us-oregon-portland-multnomah-falls",)
  places = load_all_places()
  assert len(places) == 1
  assert places[0].source_post_ids == ("instagram:post1",)


def test_process_post_places_materializes_parent_from_parent_place_name(monkeypatch, dynamodb) -> None:
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
  )

  def fake_locate(mention: PlaceMention) -> PlaceLocation | None:
    if mention.place_name == "Misery Ridge Trail":
      return PlaceLocation(
        display_name="Misery Ridge Trail",
        country_code="US",
        state_province="Oregon",
        latitude=44.3670,
        longitude=-121.1410,
      )
    if mention.place_name == "Smith Rock State Park":
      return PlaceLocation(
        display_name="Smith Rock State Park",
        country_code="US",
        state_province="Oregon",
        latitude=44.3665,
        longitude=-121.1408,
      )
    return None

  monkeypatch.setattr("travelplanner.places.locate_mention", fake_locate)

  place_ids = process_post_places(post)

  assert len(place_ids) == 2
  places = {place.display_name: place for place in load_all_places()}
  assert "Misery Ridge Trail" in places
  assert "Smith Rock State Park" in places


def test_list_places_filters_by_tag_and_country(dynamodb) -> None:
  oregon = PlaceLocation(
    display_name="Multnomah Falls",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  lisbon = PlaceLocation(
    display_name="Alfama",
    country="Portugal",
    country_code="PT",
    city="Lisbon",
    latitude=38.7131,
    longitude=-9.1279,
  )
  upsert_place(PlaceMention(place_name="Multnomah Falls", tags=("waterfall", "hike")), oregon, "a:1")
  upsert_place(PlaceMention(place_name="Alfama", tags=("neighborhood",)), lisbon, "a:2")

  assert [p.display_name for p in list_places()] == ["Alfama", "Multnomah Falls"]
  assert [p.display_name for p in list_places(tag="hike")] == ["Multnomah Falls"]
  assert [p.display_name for p in list_places(country="Portugal")] == ["Alfama"]
  assert [p.display_name for p in list_places(country="pt")] == ["Alfama"]
  assert [p.display_name for p in list_places(state_province="Oregon")] == ["Multnomah Falls"]
  assert list_places(state_province="Texas") == []


def test_reprocess_all_places_rebuilds_library_and_updates_posts(monkeypatch, dynamodb) -> None:

  post = _sample_post(extracted_places=(ExtractedPlace(place_name="Multnomah Falls"),), post_id="instagram:reelA")
  save_post(post)

  location = PlaceLocation(
    display_name="Multnomah Falls",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  monkeypatch.setattr("travelplanner.places.locate_mention", lambda mention: location)

  reprocess_all_places()

  places = load_all_places()
  assert len(places) == 1

  from travelplanner.store import load_post

  reloaded = load_post(Platform.INSTAGRAM, "reelA")
  assert reloaded is not None
  assert reloaded.place_ids == ("us-oregon-portland-multnomah-falls",)


def test_delete_all_posts_and_places(dynamodb) -> None:

  save_post(_sample_post(post_id="instagram:a"))
  save_post(_sample_post(post_id="instagram:b"))

  location = PlaceLocation(
    display_name="Multnomah Falls",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  upsert_place(PlaceMention(place_name="Multnomah Falls"), location, "instagram:a")

  posts_deleted, places_deleted, visits_deleted = cleanup_all_data()

  assert posts_deleted == 2
  assert places_deleted == 1
  assert visits_deleted == 0
  assert delete_all_posts() == 0
  assert delete_all_places() == 0
