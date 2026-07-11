from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import load_place, upsert_place
from travelplanner.visits import (
  create_visit,
  delete_visit,
  list_visits,
  load_visit,
  relink_visits,
  resolve_place_for_visit,
  visited_place_ids,
)


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


def test_create_visit_with_existing_place_id(tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
    data_dir=places_dir,
  )

  visit = create_visit(
    place_id=place_id,
    visited_from="2024-06-12",
    visited_to="2024-06-14",
    notes="Waterfall day",
    visits_data_dir=visits_dir,
    places_data_dir=places_dir,
  )

  assert visit.place_id == place_id
  assert visit.place_name == "Multnomah Falls"
  assert visit.visited_from == "2024-06-12"
  assert visit.visited_to == "2024-06-14"
  assert visit.notes == "Waterfall day"
  assert load_visit(visit.visit_id, data_dir=visits_dir) == visit
  assert visited_place_ids(data_dir=visits_dir) == {place_id}


def test_create_visit_geocodes_new_destination(monkeypatch, tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"

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
    place_query="Tokyo",
    visited_from="2023-04-01",
    visits_data_dir=visits_dir,
    places_data_dir=places_dir,
  )

  place = load_place(visit.place_id, data_dir=places_dir)
  assert place is not None
  assert place.display_name == "Tokyo"
  assert place.source_post_ids == ()
  assert list_visits(data_dir=visits_dir)[0].visit_id == visit.visit_id


def test_create_visit_prefers_library_name_match(tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"
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
    data_dir=places_dir,
  )

  visit = create_visit(
    place_query="lisbon",
    visited_from="2022-09-10",
    visits_data_dir=visits_dir,
    places_data_dir=places_dir,
  )

  assert visit.place_id == place_id


def test_create_visit_rejects_bad_dates(tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
    data_dir=places_dir,
  )

  try:
    create_visit(
      place_id=place_id,
      visited_from="2024-06-20",
      visited_to="2024-06-10",
      visits_data_dir=visits_dir,
      places_data_dir=places_dir,
    )
    assert False, "expected ValueError"
  except ValueError as exc:
    assert "visited_to" in str(exc)


def test_delete_visit(tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
    data_dir=places_dir,
  )
  visit = create_visit(
    place_id=place_id,
    visited_from="2024-01-01",
    visits_data_dir=visits_dir,
    places_data_dir=places_dir,
  )

  assert delete_visit(visit.visit_id, data_dir=visits_dir) is True
  assert load_visit(visit.visit_id, data_dir=visits_dir) is None
  assert list_visits(data_dir=visits_dir) == []


def test_relink_visits_after_place_wipe(monkeypatch, tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"
  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    _sample_location(),
    "instagram:reel1",
    data_dir=places_dir,
  )
  visit = create_visit(
    place_id=place_id,
    visited_from="2024-01-01",
    visits_data_dir=visits_dir,
    places_data_dir=places_dir,
  )

  for path in places_dir.glob("*.json"):
    path.unlink()
  assert load_place(place_id, data_dir=places_dir) is None

  def fake_resolve(**kwargs):
    assert kwargs["place_query"] == "Multnomah Falls"
    restored_id = upsert_place(
      PlaceMention(place_name="Multnomah Falls"),
      _sample_location(),
      source_post_id=None,
      data_dir=places_dir,
    )
    return load_place(restored_id, data_dir=places_dir)

  monkeypatch.setattr("travelplanner.visits.resolve_place_for_visit", fake_resolve)

  relink_visits(visits_data_dir=visits_dir, places_data_dir=places_dir)
  reloaded = load_visit(visit.visit_id, data_dir=visits_dir)
  assert reloaded is not None
  assert load_place(reloaded.place_id, data_dir=places_dir) is not None


def test_resolve_place_requires_id_or_query(tmp_path) -> None:
  try:
    resolve_place_for_visit(places_data_dir=tmp_path)
    assert False, "expected ValueError"
  except ValueError as exc:
    assert "place_id or place_query" in str(exc)
