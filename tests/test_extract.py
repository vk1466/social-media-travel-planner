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


def test_reel_extract_prompt_includes_core_rules() -> None:
  assert "Sources for place NAMES" in REEL_EXTRACT_PROMPT
  assert "VIDEO SUMMARY is supporting context only" in REEL_EXTRACT_PROMPT
  assert "Never invent or guess a place name" in REEL_EXTRACT_PROMPT
  assert "parent_place_name" in REEL_EXTRACT_PROMPT
  assert "parent_category" in REEL_EXTRACT_PROMPT
  assert "Never invent generic tips" in REEL_EXTRACT_PROMPT
  assert "Parents → park, city, neighborhood, or landmark" in REEL_EXTRACT_PROMPT


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
        "parent_category": "landmark",
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
        "parent_category": None,
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
      parent_category="landmark",
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
      {
        "place_name": "Null Fields Spot",
        "city": "null",
        "state_province": "None",
        "country": "n/a",
        "details": "null",
        "tips": [],
        "category": "viewpoint",
        "attributes": [],
        "parent_place_name": "nil",
        "parent_category": None,
      },
    ]
  }

  places = _parse_extracted_places(data)
  assert places[0].category == "hike"
  assert places[0].attributes == ("viewpoint",)
  assert places[1].category is None
  assert places[1].attributes == ()
  assert places[1].place_name == "Unknown Type Spot"
  assert places[2].city is None
  assert places[2].state_province is None
  assert places[2].country is None
  assert places[2].details is None
  assert places[2].parent_place_name is None


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


def test_format_reel_bundle_orders_caption_summary_transcript() -> None:
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
    video_summary="A walking tour through Lisbon's oldest neighborhood.",
  )

  formatted = format_reel_bundle(bundle)

  assert formatted.index("CAPTION:") < formatted.index("VIDEO SUMMARY:")
  assert formatted.index("VIDEO SUMMARY:") < formatted.index("VIDEO TRANSCRIPT:")
  assert "LOCATION TAG: Alfama, Lisbon, Portugal" in formatted
  assert "CAPTION:\nDay 1: Alfama" in formatted
  assert "VIDEO SUMMARY:\nA walking tour through Lisbon's oldest neighborhood." in formatted
  assert "HASHTAGS: #lisbon #portugal" in formatted
  assert "The pastel de nata spot is Manteigaria!" in formatted
  assert "VIDEO TRANSCRIPT:\nWelcome to Alfama" in formatted


def test_snippets_from_bundle_are_source_text_pairs() -> None:
  from travelplanner.extract import ContentSnippet, snippets_from_bundle

  bundle = ReelBundle(
    caption="Day 1: Alfama",
    hashtags=("lisbon",),
    location_tag=PlatformPlace(place_name="Alfama", city="Lisbon", country="Portugal"),
    transcript="Welcome to Alfama.",
  )
  snippets = snippets_from_bundle(bundle)
  assert snippets == (
    ContentSnippet(source="caption", text="Day 1: Alfama"),
    ContentSnippet(source="transcript", text="Welcome to Alfama."),
    ContentSnippet(source="location_tag", text="Alfama, Lisbon, Portugal"),
    ContentSnippet(source="hashtags", text="#lisbon"),
  )


def test_fetch_places_from_snippets_empty_without_api_key(monkeypatch) -> None:
  from travelplanner.extract import ContentSnippet, fetch_places_from_snippets

  monkeypatch.setattr("travelplanner.settings.openai_api_key", lambda: None)
  result = fetch_places_from_snippets(
    (ContentSnippet(source="caption", text="Emerald Bay"),)
  )
  assert result == ReelExtraction()


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
    video_summary="Two Tahoe stops with an overlook and a beach.",
  )
  result = fetch_places_from_reel(bundle)

  assert result.reel_summary == "Two Lake Tahoe stops: Emerald Bay overlook and Sand Harbor beach."
  assert len(result.places) == 2
  assert result.places[0].place_name == "Emerald Bay"
  assert result.places[0].category == "viewpoint"
  assert result.places[0].parent_place_name == "Lake Tahoe"
  assert result.places[0].details == "Scenic overlook on the west shore."
  assert result.places[0].tips == ("Go at sunrise",)
