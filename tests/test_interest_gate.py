from travelplanner.flow.context import IngestContext, TimelineContext
from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import ExtractedPlace, PlaceMention
from travelplanner.places.interest_gate import jev_is_place_of_interest
from travelplanner.places.locate import LocateDebugResult
from travelplanner.steps.locate_by_name import locate_by_name
from travelplanner.steps.process_mentions import process_mentions


def _location(**overrides) -> PlaceLocation:
  fields = dict(
    display_name="Kensington Market",
    country="Canada",
    country_code="CA",
    state_province="Ontario",
    city="Toronto",
    latitude=43.655,
    longitude=-79.402,
    osm_class="boundary",
    osm_type="administrative",
  )
  fields.update(overrides)
  return PlaceLocation(**fields)


def _post(name: str, category: str = "market") -> SavedPost:
  return SavedPost(
    post_id="instagram:interest",
    post_url="https://www.instagram.com/reel/interest/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="places to see",
    extracted_places=(
      ExtractedPlace(place_name=name, city="Toronto", country="Canada", category=category),
    ),
  )


def test_jev_keeps_a_place_of_interest(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    assert "Kensington Market" in state
    assert "interest" in questions
    return {"answers": {"interest": {"type": "choice", "choice": "keep", "reason": "neighborhood"}}}

  monkeypatch.setattr("travelplanner.places.interest_gate.system_one", fake_system_one)
  keep, reason = jev_is_place_of_interest(
    _location(),
    PlaceMention(place_name="Kensington Market", category="market"),
  )
  assert keep is True
  assert reason == "neighborhood"


def test_jev_drops_when_unavailable(monkeypatch) -> None:
  def fake_system_one(*, state: str, questions: dict) -> dict:
    raise RuntimeError("JEV_API_KEY is not set")

  monkeypatch.setattr("travelplanner.places.interest_gate.system_one", fake_system_one)
  keep, reason = jev_is_place_of_interest(_location())
  assert keep is False
  assert "unavailable" in reason


def test_process_mentions_keeps_admin_tag_when_jev_says_keep(monkeypatch, dynamodb) -> None:
  post = _post("Kensington Market")
  monkeypatch.setattr(
    "travelplanner.places.mention_gate.locate_mention_debug",
    lambda mention, **_: LocateDebugResult(
      status="resolved",
      location=_location(),
      match_confidence=0.82,
      notes=("ok",),
    ),
  )
  monkeypatch.setattr(
    "travelplanner.places.mention_gate.jev_is_place_of_interest",
    lambda location, mention=None: (True, "neighborhood worth seeing"),
  )

  result = process_mentions(
    IngestContext(post_url=post.post_url, user_id="u1", post=post, place_library=[])
  )
  assert len(result.place_ids) == 1
  assert result.place_outcomes[0].status == "resolved"


def test_process_mentions_drops_admin_tag_when_jev_says_drop(monkeypatch, dynamodb) -> None:
  post = _post("Oregon", category="region")
  monkeypatch.setattr(
    "travelplanner.places.mention_gate.locate_mention_debug",
    lambda mention, **_: LocateDebugResult(
      status="resolved",
      location=_location(display_name="Oregon", city=None, osm_type="administrative"),
      match_confidence=0.9,
      notes=("ok",),
    ),
  )
  monkeypatch.setattr(
    "travelplanner.places.mention_gate.jev_is_place_of_interest",
    lambda location, mention=None: (False, "a state, not a place to see"),
  )

  result = process_mentions(
    IngestContext(post_url=post.post_url, user_id="u1", post=post, place_library=[])
  )
  assert result.place_ids == []
  assert result.place_outcomes[0].status == "rejected"
  assert "not a place of interest" in (result.place_outcomes[0].reason or "")


def test_locate_by_name_keeps_jev_override_past_osm_gate(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.places.mention_gate.locate_mention_debug",
    lambda mention, **_: LocateDebugResult(
      status="resolved",
      location=_location(display_name="Spadina House", osm_class="building", osm_type="detached"),
      match_confidence=0.76,
    ),
  )
  monkeypatch.setattr(
    "travelplanner.places.mention_gate.jev_is_place_of_interest",
    lambda location, mention=None: (True, "historic house museum"),
  )

  ctx = locate_by_name(
    TimelineContext(
      latitude=43.679,
      longitude=-79.408,
      place_name="Spadina House",
      needs_osm_gate=True,
    )
  )
  assert ctx.locate_outcome is not None
  assert ctx.locate_outcome.status == "resolved"
