from travelplanner.place_hints import PlaceMention
from travelplanner.places.locate import (
  _suffix_penalty,
  geocode_queries,
  name_similarity,
  score_match,
)
from travelplanner.clients.geocoder import GeocodeResult


def test_geocode_queries_omit_parent_token() -> None:
  mention = PlaceMention(
    place_name="Misery Ridge",
    parent_place_name="Smith Rock State Park",
    state_province="Oregon",
    country="USA",
  )
  queries = geocode_queries(mention)
  assert queries[0] == "Misery Ridge, Oregon, USA"
  assert all("Smith Rock" not in query for query in queries)


def test_geocode_queries_include_apostrophe_stripped_variant() -> None:
  mention = PlaceMention(
    place_name="Angel's Landing",
    state_province="Utah",
    country="USA",
  )
  queries = geocode_queries(mention)
  assert "Angel's Landing, Utah, USA" in queries
  assert "Angels Landing, Utah, USA" in queries


def test_suffix_penalty_for_drive() -> None:
  assert _suffix_penalty("Angel's Landing", "Angel's Landing Drive") > 0
  assert _suffix_penalty("Old Faithful", "Old Faithful Inn") > 0
  assert _suffix_penalty("Misery Ridge", "Misery Ridge Trail") == 0


def test_score_match_prefers_natural_over_highway() -> None:
  mention = PlaceMention(
    place_name="Angel's Landing",
    parent_place_name="Zion National Park",
    state_province="Utah",
    country="USA",
  )
  trail = GeocodeResult(
    display_name="Angel's Landing",
    latitude=37.269,
    longitude=-112.948,
    state_province="Utah",
    country="United States",
    country_code="US",
    category="natural",
  )
  road = GeocodeResult(
    display_name="Angel's Landing Drive",
    latitude=41.145,
    longitude=-111.794,
    state_province="Utah",
    country="United States",
    country_code="US",
    category="highway",
  )
  assert score_match(mention, trail, anchor_lat=37.3, anchor_lon=-113.0) > score_match(
    mention, road, anchor_lat=37.3, anchor_lon=-113.0
  )


def test_score_match_prefers_attraction_over_town() -> None:
  mention = PlaceMention(place_name="Banff", country="Canada")
  town = GeocodeResult(
    display_name="Banff",
    latitude=51.175,
    longitude=-115.572,
    country="Canada",
    country_code="CA",
    category="place",
  )
  attraction = GeocodeResult(
    display_name="Banff",
    latitude=51.175,
    longitude=-115.572,
    country="Canada",
    country_code="CA",
    category="attraction",
  )
  assert score_match(mention, attraction) > score_match(mention, town)
  assert score_match(mention, town) >= 0.72


def test_score_match_prefers_attraction_over_office() -> None:
  mention = PlaceMention(place_name="Multnomah Falls", state_province="Oregon", country="USA")
  attraction = GeocodeResult(
    display_name="Multnomah Falls",
    latitude=45.5,
    longitude=-122.1,
    state_province="Oregon",
    country="United States",
    country_code="US",
    category="attraction",
  )
  office = GeocodeResult(
    display_name="Multnomah Falls Realty",
    latitude=45.5,
    longitude=-122.1,
    state_province="Oregon",
    country="United States",
    country_code="US",
    category="office",
  )
  assert score_match(mention, attraction) > score_match(mention, office)


def test_should_ask_llm_when_scores_close() -> None:
  from travelplanner.places.locate import _should_ask_llm

  strong = GeocodeResult(
    display_name="A",
    latitude=1.0,
    longitude=2.0,
    category="natural",
    country="Canada",
    country_code="CA",
  )
  weak = GeocodeResult(
    display_name="B",
    latitude=1.1,
    longitude=2.1,
    category="place",
    country="Canada",
    country_code="CA",
  )
  assert _should_ask_llm([(0.95, strong)]) is False
  assert _should_ask_llm([(0.80, strong), (0.78, weak)]) is True
  assert _should_ask_llm([(0.60, weak)]) is True


def test_llm_pick_selects_candidate(monkeypatch) -> None:
  from travelplanner.places.locate import _pick_best

  trail = GeocodeResult(
    display_name="Misery Ridge Trail",
    latitude=44.3705,
    longitude=-121.1410,
    country="United States",
    country_code="US",
    state_province="Oregon",
    category="attraction",
  )
  parking = GeocodeResult(
    display_name="Misery Ridge Parking",
    latitude=44.3680,
    longitude=-121.1400,
    country="United States",
    country_code="US",
    state_province="Oregon",
    category="parking",
  )
  mention = PlaceMention(
    place_name="Misery Ridge",
    parent_place_name="Smith Rock State Park",
    state_province="Oregon",
    country="USA",
  )
  monkeypatch.setattr(
    "travelplanner.places.locate._should_ask_llm",
    lambda scored: True,
  )
  monkeypatch.setattr(
    "travelplanner.places.llm_pick.pick_candidate_index",
    lambda mention, candidates: (0, "llm_pick chose #0 (trail near Smith Rock)"),
  )

  notes: list[str] = []
  picked = _pick_best(
    mention,
    [parking, trail],
    anchor_lat=44.367,
    anchor_lon=-121.141,
    notes=notes,
  )
  assert picked is not None
  result, confidence = picked
  assert result.display_name == "Misery Ridge Trail"
  assert confidence >= 0.72
  assert any("llm override" in note for note in notes)


def test_llm_pick_reject_all_returns_unresolved(monkeypatch) -> None:
  from travelplanner.places.locate import _pick_best

  only = GeocodeResult(
    display_name="Random Drive",
    latitude=44.0,
    longitude=-121.0,
    country="United States",
    country_code="US",
    category="highway",
  )
  mention = PlaceMention(place_name="Mystery Spot", country="USA")
  monkeypatch.setattr(
    "travelplanner.places.locate._should_ask_llm",
    lambda scored: True,
  )
  monkeypatch.setattr(
    "travelplanner.places.llm_pick.pick_candidate_index",
    lambda mention, candidates: (None, "llm_pick rejected all (none match)"),
  )
  notes: list[str] = []
  assert _pick_best(mention, [only], anchor_lat=None, anchor_lon=None, notes=notes) is None


def test_name_similarity_aliases() -> None:
  assert name_similarity("Misery Ridge", "Misery Ridge Trail") >= 0.5
  assert name_similarity("Angel Landing", "Angel's Landing") >= 0.5
  assert name_similarity("Smith Rock", "Multnomah Falls") < 0.4
