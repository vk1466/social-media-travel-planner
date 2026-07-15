from travelplanner.db import places_repo
from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import load_place, upsert_place
from travelplanner.visits import (
  create_visit,
  delete_visit,
  list_visits,
  load_visit,
  mark_been,
  relink_visits,
  resolve_place_for_visit,
  unmark_been,
  visited_place_ids,
)

USER = "user-a"


def _sample_location(**overrides) -> PlaceLocation:
  base = dict(
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
  base.update(overrides)
  return PlaceLocation(**base)


def test_create_visit_with_existing_place_id(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )

  visit = create_visit(
    user_id=USER,
    place_id=place_id,
    visited_from="2024-06-12",
    visited_to="2024-06-14",
    notes="Waterfall day",
  )

  assert visit.place_id == place_id
  assert visit.place_name == "Multnomah Falls"
  assert visit.visited_from == "2024-06-12"
  assert visit.visited_to == "2024-06-14"
  assert visit.notes == "Waterfall day"
  assert load_visit(USER, visit.visit_id) == visit
  assert visited_place_ids(USER) == {place_id}


def test_create_visit_geocodes_new_destination(monkeypatch, dynamodb) -> None:
  def fake_locate(mention: PlaceMention) -> PlaceLocation:
    assert mention.place_name == "Tokyo"
    return _sample_location(
      display_name="Tokyo",
      continent="Asia",
      country="Japan",
      country_code="JP",
      state_province="Tokyo",
      city="Tokyo",
      latitude=35.6762,
      longitude=139.6503,
      provider_place_id="tokyo-1",
    )

  monkeypatch.setattr("travelplanner.visits.locate_mention", fake_locate)

  visit = create_visit(
    user_id=USER,
    place_query="Tokyo",
    visited_from="2023-04-01",
  )

  place = load_place(visit.place_id)
  assert place is not None
  assert place.display_name == "Tokyo"
  assert place.source_post_ids == ()
  assert list_visits(USER)[0].visit_id == visit.visit_id


def test_create_visit_prefers_library_name_match(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Lisbon"),
    _sample_location(
      display_name="Lisbon",
      continent="Europe",
      country="Portugal",
      country_code="PT",
      state_province="Lisbon",
      city="Lisbon",
      latitude=38.7223,
      longitude=-9.1393,
    ),
    "instagram:reel2",
  )

  visit = create_visit(
    user_id=USER,
    place_query="lisbon",
    visited_from="2022-09-10",
  )

  assert visit.place_id == place_id


def test_create_visit_without_dates(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )

  visit = create_visit(user_id=USER, place_id=place_id)

  assert visit.visited_from is None
  assert visit.visited_to is None
  assert visited_place_ids(USER) == {place_id}


def test_create_visit_rejects_to_without_from(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )

  try:
    create_visit(
      user_id=USER,
      place_id=place_id,
      visited_to="2024-06-14",
    )
    assert False, "expected ValueError"
  except ValueError as exc:
    assert "visited_from" in str(exc)


def test_mark_been_is_idempotent(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )

  first = mark_been(user_id=USER, place_id=place_id)
  second = mark_been(user_id=USER, place_id=place_id)

  assert first.visit_id == second.visit_id
  assert first.visited_from is None
  assert list_visits(USER) == [first]


def test_unmark_been_removes_visits(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )
  create_visit(
    user_id=USER,
    place_id=place_id,
    visited_from="2024-06-12",
  )
  create_visit(user_id=USER, place_id=place_id)

  deleted = unmark_been(user_id=USER, place_id=place_id)

  assert deleted == 2
  assert visited_place_ids(USER) == set()
  assert list_visits(USER) == []


def test_create_visit_rejects_bad_dates(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )

  try:
    create_visit(
      user_id=USER,
      place_id=place_id,
      visited_from="2024-06-20",
      visited_to="2024-06-10",
    )
    assert False, "expected ValueError"
  except ValueError as exc:
    assert "visited_to" in str(exc)


def test_delete_visit(dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )
  visit = create_visit(
    user_id=USER,
    place_id=place_id,
    visited_from="2024-01-01",
  )

  assert delete_visit(USER, visit.visit_id) is True
  assert load_visit(USER, visit.visit_id) is None
  assert list_visits(USER) == []


def test_relink_visits_after_place_wipe(monkeypatch, dynamodb) -> None:
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
  )
  visit = create_visit(
    user_id=USER,
    place_id=place_id,
    visited_from="2024-01-01",
  )

  places_repo.delete_all_places()
  assert load_place(place_id) is None

  def fake_resolve(**kwargs):
    assert kwargs["place_query"] == "Multnomah Falls"
    restored_id = upsert_place(
      PlaceMention(place_name="Multnomah Falls"),
      _sample_location(),
      source_post_id=None,
    )
    return load_place(restored_id)

  monkeypatch.setattr("travelplanner.visits.resolve_place_for_visit", fake_resolve)

  relink_visits(user_id=USER)
  reloaded = load_visit(USER, visit.visit_id)
  assert reloaded is not None
  assert load_place(reloaded.place_id) is not None


def test_resolve_place_requires_id_or_query(dynamodb) -> None:
  try:
    resolve_place_for_visit()
    assert False, "expected ValueError"
  except ValueError as exc:
    assert "place_id or place_query" in str(exc)
