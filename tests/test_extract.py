from travelplanner.extract import (
  REEL_EXTRACT_PROMPT,
  ReelBundle,
  ReelExtraction,
  _parse_extracted_places,
  _parse_reel_extraction,
  fetch_places_from_reel,
  format_reel_bundle,
)
from travelplanner.place_hints import ExtractedPlace, PlatformPlace


def test_reel_extract_prompt_includes_geocoding_rules() -> None:
  assert "city — a real city or town only" in REEL_EXTRACT_PROMPT
  assert "parent_place_name" in REEL_EXTRACT_PROMPT
  assert "Skip vague regions as standalone places" in REEL_EXTRACT_PROMPT
  assert "Picture Lake, Mt. Baker, Washington" in REEL_EXTRACT_PROMPT
  assert "Travel destinations only" in REEL_EXTRACT_PROMPT
  assert "real estate offices" in REEL_EXTRACT_PROMPT
  assert "reel_summary" in REEL_EXTRACT_PROMPT
  assert "Category = what the pin is" in REEL_EXTRACT_PROMPT
  assert "Allowed attributes by category" in REEL_EXTRACT_PROMPT
  assert "waterfall / falls" in REEL_EXTRACT_PROMPT
  assert "Victoria Falls" in REEL_EXTRACT_PROMPT
  assert "hike: viewpoint, waterfall, summit, loop" in REEL_EXTRACT_PROMPT
  assert "landmark: hike, viewpoint" in REEL_EXTRACT_PROMPT


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
        "category": "park",
        "attributes": [],
        "parent_place_name": "Oregon Coast",
      },
      {
        "place_name": "Tillamook Creamery",
        "city": None,
        "state_province": None,
        "country": None,
        "details": "Stop for cheese and ice cream.",
        "tips": [],
        "category": "landmark",
        "attributes": [],
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
      category="park",
      attributes=(),
      parent_place_name="Oregon Coast",
    ),
    ExtractedPlace(
      place_name="Tillamook Creamery",
      city=None,
      country=None,
      details="Stop for cheese and ice cream.",
      tips=(),
      category="landmark",
      attributes=(),
    ),
  )


def test_parse_extracted_places_filters_attributes_and_unknown_category() -> None:
  data = {
    "places": [
      {
        "place_name": "Mystery Spot",
        "city": None,
        "state_province": None,
        "country": None,
        "details": None,
        "tips": [],
        "category": "hike",
        "attributes": ["viewpoint", "not-a-real-attr", "hike"],
        "parent_place_name": None,
      },
      {
        "place_name": "Unknown Type Spot",
        "city": None,
        "state_province": None,
        "country": None,
        "details": "Still a place",
        "tips": [],
        "category": "spaceship",
        "attributes": ["viewpoint"],
        "parent_place_name": None,
      },
    ]
  }

  places = _parse_extracted_places(data)
  assert places[0].category == "hike"
  assert places[0].attributes == ("viewpoint",)
  assert places[1].category is None
  assert places[1].attributes == ()
  assert places[1].place_name == "Unknown Type Spot"


def test_parse_extracted_places_empty() -> None:
  assert _parse_extracted_places(None) == ()
  assert _parse_extracted_places({}) == ()
  assert _parse_extracted_places({"places": []}) == ()


def test_parse_reel_extraction_includes_summary() -> None:
  data = {
    "reel_summary": "A coastal Oregon day trip with viewpoints and a creamery stop.",
    "places": [
      {
        "place_name": "Ecola State Park",
        "city": "Cannon Beach",
        "state_province": "Oregon",
        "country": "USA",
        "details": "Cliffside views over Haystack Rock.",
        "tips": [],
        "category": "viewpoint",
        "attributes": [],
        "parent_place_name": None,
      }
    ],
  }
  result = _parse_reel_extraction(data)
  assert result.reel_summary == "A coastal Oregon day trip with viewpoints and a creamery stop."
  assert len(result.places) == 1
  assert result.places[0].place_name == "Ecola State Park"
  assert result.places[0].category == "viewpoint"


def test_format_reel_bundle_includes_all_sources() -> None:
  bundle = ReelBundle(
    caption="Day 1: Alfama",
    hashtags=("lisbon", "portugal"),
    top_comments=("The pastel de nata spot is Manteigaria!",),
    location_tag=PlatformPlace(
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
  assert fetch_places_from_reel(bundle) == ReelExtraction()


def test_fetch_places_from_reel_parses_structured_response(monkeypatch) -> None:
  payload = {
    "reel_summary": "Two Lake Tahoe stops: Emerald Bay overlook and Sand Harbor beach.",
    "places": [
      {
        "place_name": "Emerald Bay",
        "city": None,
        "state_province": "California",
        "country": "USA",
        "details": "Scenic overlook on the west shore.",
        "tips": ["Go at sunrise"],
        "category": "viewpoint",
        "attributes": [],
        "parent_place_name": "Lake Tahoe",
      },
      {
        "place_name": "Sand Harbor",
        "city": None,
        "state_province": None,
        "country": None,
        "details": None,
        "tips": [],
        "category": "beach",
        "attributes": [],
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
  result = fetch_places_from_reel(bundle)

  assert result.reel_summary == "Two Lake Tahoe stops: Emerald Bay overlook and Sand Harbor beach."
  assert len(result.places) == 2
  assert result.places[0].place_name == "Emerald Bay"
  assert result.places[0].category == "viewpoint"
  assert result.places[0].parent_place_name == "Lake Tahoe"
  assert result.places[0].details == "Scenic overlook on the west shore."
  assert result.places[0].tips == ("Go at sunrise",)
