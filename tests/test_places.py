from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace
from travelplanner.places import (
  LocateDebugResult,
  cleanup_all_data,
  delete_all_places,
  geocode_queries,
  is_visitable_place,
  list_places,
  load_all_places,
  load_place,
  mentions_from_post,
  place_key,
  process_post_places,
  reprocess_all_places,
  slugify,
  upsert_place,
)
from travelplanner.store import delete_all_posts, save_post


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
        category="landmark",
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
      category="landmark",
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
        parent_category="park",
        category="hike",
      ),
    ),
  )

  mentions = mentions_from_post(post)
  assert mentions == (
    PlaceMention(
      place_name="Misery Ridge Trail",
      country="USA",
      state_province="Oregon",
      category="hike",
      parent_place_name="Smith Rock State Park",
    ),
    PlaceMention(
      place_name="Smith Rock State Park",
      country="USA",
      state_province="Oregon",
      category="park",
    ),
  )


def test_mentions_from_post_uses_parent_category_neighborhood() -> None:
  post = _sample_post(
    extracted_places=(
      ExtractedPlace(
        place_name="Steam Clock",
        state_province="British Columbia",
        country="Canada",
        parent_place_name="Gastown",
        parent_category="neighborhood",
        category="landmark",
      ),
    ),
  )

  mentions = mentions_from_post(post)
  parent = next(mention for mention in mentions if mention.place_name == "Gastown")
  assert parent.category == "neighborhood"


def test_mentions_from_post_leaves_parent_category_none_without_hint() -> None:
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
  )

  mentions = mentions_from_post(post)
  parent = next(mention for mention in mentions if mention.place_name == "Smith Rock State Park")
  assert parent.category is None


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
        category="park",
      ),
      ExtractedPlace(
        place_name="Misery Ridge Trail",
        state_province="Oregon",
        country="USA",
        parent_place_name="Smith Rock State Park",
        category="hike",
      ),
    ),
  )

  mentions = mentions_from_post(post)
  park_mentions = [mention for mention in mentions if mention.place_name == "Smith Rock State Park"]
  assert len(park_mentions) == 1
  assert park_mentions[0].category == "park"


def test_geocode_queries_falls_back_to_simpler_queries() -> None:
  mention = PlaceMention(
    place_name="Picture Lake",
    city="Mt. Baker",
    state_province="Washington",
    country="USA",
  )
  assert geocode_queries(mention) == (
    "Picture Lake, Mt. Baker, Washington, USA",
    "Picture Lake, Washington, USA",
    "Picture Lake, USA",
    "Picture Lake",
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


def test_upsert_place_creates_new_place(dynamodb) -> None:
  mention = PlaceMention(
    place_name="Multnomah Falls",
    category="waterfall",
    attributes=("hike",),
    tips=("Arrive early",),
  )
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
  assert place.category == "waterfall"
  assert place.attributes == ("hike",)
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

  first = PlaceMention(place_name="Multnomah Falls", category="waterfall", attributes=("hike",), tips=("Arrive early",))
  upsert_place(first, location, "instagram:abc123")

  second = PlaceMention(
    place_name="Mult Falls",
    category="hike",
    tips=("Bring water", "Arrive early"),
    details="Tallest waterfall in Oregon",
  )
  place_id = upsert_place(second, location, "youtube:xyz789")

  assert place_id == "us-oregon-portland-multnomah-falls"
  places = load_all_places()
  assert len(places) == 1

  merged = places[0]
  assert merged.category == "waterfall"
  assert merged.attributes == ("hike",)
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
  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(status="unresolved"),
  )

  place_ids = process_post_places(post)

  assert place_ids == ()
  assert load_all_places() == []


def test_process_post_places_returns_ids_for_located_mentions(monkeypatch, dynamodb) -> None:
  post = _sample_post(
    extracted_places=(ExtractedPlace(place_name="Multnomah Falls", category="waterfall"),),
  )
  location = PlaceLocation(
    display_name="Multnomah Falls",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(status="resolved", location=location),
  )

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
        category="hike",
      ),
    ),
  )

  def fake_locate(mention: PlaceMention) -> LocateDebugResult:
    if mention.place_name == "Misery Ridge Trail":
      return LocateDebugResult(
        status="resolved",
        location=PlaceLocation(
          display_name="Misery Ridge Trail",
          country_code="US",
          state_province="Oregon",
          latitude=44.3670,
          longitude=-121.1410,
        ),
      )
    if mention.place_name == "Smith Rock State Park":
      return LocateDebugResult(
        status="resolved",
        location=PlaceLocation(
          display_name="Smith Rock State Park",
          country_code="US",
          state_province="Oregon",
          latitude=44.3665,
          longitude=-121.1408,
        ),
      )
    return LocateDebugResult(status="unresolved")

  monkeypatch.setattr("travelplanner.places.pipeline.locate_mention_debug", fake_locate)

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
  upsert_place(
    PlaceMention(place_name="Multnomah Falls", category="waterfall", attributes=("hike",)),
    oregon,
    "a:1",
  )
  upsert_place(PlaceMention(place_name="Alfama", category="neighborhood"), lisbon, "a:2")

  assert [p.display_name for p in list_places()] == ["Alfama", "Multnomah Falls"]
  assert [p.display_name for p in list_places(category="waterfall")] == ["Multnomah Falls"]
  assert [p.display_name for p in list_places(category="uncategorized")] == []
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
  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(status="resolved", location=location),
  )

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
