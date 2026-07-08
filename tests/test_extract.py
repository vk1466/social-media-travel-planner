from travelplanner.extract import (
  REEL_EXTRACT_PROMPT,
  ReelBundle,
  _parse_extracted_places,
  fetch_places_from_reel,
  format_reel_bundle,
)
from travelplanner.models import ExtractedPlace, Place


def test_reel_extract_prompt_includes_geocoding_rules() -> None:
  assert "city — a real city or town only" in REEL_EXTRACT_PROMPT
  assert "parent_place_name" in REEL_EXTRACT_PROMPT
  assert "Skip vague regions as standalone places" in REEL_EXTRACT_PROMPT
  assert "Picture Lake, Mt. Baker, Washington" in REEL_EXTRACT_PROMPT
  assert "Travel destinations only" in REEL_EXTRACT_PROMPT
  assert "real estate offices" in REEL_EXTRACT_PROMPT


def test_parse_extracted_places() -> None:
  data = {
    "places": [
      {
        "place_name": "Ecola State Park",
        "city": "Cannon Beach",
        "state_province": "Oregon",
        "country": "USA",
        "details": "Start day one here for amazing views.",
        "tips": ["Arrive before sunset", "Bring a jacket"],
        "tags": ["viewpoint", "hike"],
        "parent_place_name": "Oregon Coast",
      },
      {
        "place_name": "Tillamook Creamery",
        "city": None,
        "state_province": None,
        "country": None,
        "details": "Stop for cheese and ice cream.",
        "tips": [],
        "tags": [],
        "parent_place_name": None,
      },
    ]
  }

  places = _parse_extracted_places(data)
  assert places == (
    ExtractedPlace(
      place_name="Ecola State Park",
      city="Cannon Beach",
      state_province="Oregon",
      country="USA",
      details="Start day one here for amazing views.",
      tips=("Arrive before sunset", "Bring a jacket"),
      tags=("viewpoint", "hike"),
      parent_place_name="Oregon Coast",
    ),
    ExtractedPlace(
      place_name="Tillamook Creamery",
      city=None,
      country=None,
      details="Stop for cheese and ice cream.",
      tips=(),
    ),
  )


def test_parse_extracted_places_drops_unknown_tags() -> None:
  data = {
    "places": [
      {
        "place_name": "Mystery Spot",
        "city": None,
        "state_province": None,
        "country": None,
        "details": None,
        "tips": [],
        "tags": ["hike", "not-a-real-tag"],
        "parent_place_name": None,
      }
    ]
  }

  places = _parse_extracted_places(data)
  assert places[0].tags == ("hike",)


def test_parse_extracted_places_empty() -> None:
  assert _parse_extracted_places(None) == ()
  assert _parse_extracted_places({}) == ()
  assert _parse_extracted_places({"places": []}) == ()


def test_format_reel_bundle_includes_all_sources() -> None:
  bundle = ReelBundle(
    caption="Day 1: Alfama",
    hashtags=("lisbon", "portugal"),
    top_comments=("The pastel de nata spot is Manteigaria!",),
    location_tag=Place(
      place_name="Alfama",
      city="Lisbon",
      country="Portugal",
    ),
    transcript="Welcome to Alfama, Lisbon's oldest neighborhood.",
  )

  formatted = format_reel_bundle(bundle)

  assert "IG LOCATION TAG: Alfama, Lisbon, Portugal" in formatted
  assert "CAPTION:\nDay 1: Alfama" in formatted
  assert "HASHTAGS: #lisbon #portugal" in formatted
  assert "The pastel de nata spot is Manteigaria!" in formatted
  assert "VIDEO TRANSCRIPT:\nWelcome to Alfama" in formatted


def test_fetch_places_from_reel_returns_empty_without_api_key(monkeypatch) -> None:
  monkeypatch.setattr("travelplanner.settings.openai_api_key", lambda: None)
  bundle = ReelBundle(caption="Day 1: Emerald Bay\nDay 2: Sand Harbor")
  assert fetch_places_from_reel(bundle) == ()


def test_fetch_places_from_reel_parses_structured_response(monkeypatch) -> None:
  payload = {
    "places": [
      {
        "place_name": "Emerald Bay",
        "city": None,
        "state_province": "California",
        "country": "USA",
        "details": "Scenic overlook on the west shore.",
        "tips": ["Go at sunrise"],
        "tags": ["viewpoint"],
        "parent_place_name": "Lake Tahoe",
      },
      {
        "place_name": "Sand Harbor",
        "city": None,
        "state_province": None,
        "country": None,
        "details": None,
        "tips": [],
        "tags": [],
        "parent_place_name": "Lake Tahoe",
      },
    ]
  }

  class FakeMessage:
    content = __import__("json").dumps(payload)

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

  bundle = ReelBundle(
    caption="📍 Emerald Bay\n📍 Sand Harbor",
    top_comments=("Sand Harbor beach is best before noon",),
    transcript="First stop Emerald Bay, then Sand Harbor.",
  )
  places = fetch_places_from_reel(bundle)

  assert len(places) == 2
  assert places[0].place_name == "Emerald Bay"
  assert places[0].parent_place_name == "Lake Tahoe"
  assert places[0].details == "Scenic overlook on the west shore."
  assert places[0].tips == ("Go at sunrise",)
