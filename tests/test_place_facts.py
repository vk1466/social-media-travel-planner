"""Unit tests for type-specific place facts (Phase 1)."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Any

from travelplanner.db.places_repo import save_place_facts
from travelplanner.feature_flag import FeatureFlag
from travelplanner.models import FactEvidence, Place, PlaceFacts, PlaceLocation
from travelplanner.places.facts.config.categories import completeness_status
from travelplanner.places.facts.enrich import enrich_place_facts, facts_are_stale
from travelplanner.places.facts.pipeline.match import match_documents, match_radius_m
from travelplanner.places.facts.pipeline.verify import overlay_interpretive_facts, verify_facts
from travelplanner.places.facts.tools.catalog import select_tools
from travelplanner.places.facts.types import FactQuery, FactTool, SourceDocument, utc_now_iso
from travelplanner.places.store import load_place, save_place


def _place(
  *,
  place_id: str = "us-oregon-crater-lake",
  display_name: str = "Crater Lake",
  category: str = "park",
  latitude: float = 42.9446,
  longitude: float = -122.1090,
  aliases: tuple[str, ...] = (),
  facts: PlaceFacts | None = None,
) -> Place:
  return Place(
    place_id=place_id,
    display_name=display_name,
    location=PlaceLocation(
      display_name=display_name,
      country="United States",
      country_code="US",
      state_province="Oregon",
      latitude=latitude,
      longitude=longitude,
    ),
    aliases=aliases,
    category=category,
    facts=facts,
  )


def _doc(
  *,
  source_ref: str,
  title: str,
  source_name: str = "osm",
  latitude: float | None = 42.9446,
  longitude: float | None = -122.1090,
  content: dict[str, Any] | None = None,
) -> SourceDocument:
  return SourceDocument(
    tool_id="test",
    source_name=source_name,
    source_ref=source_ref,
    title=title,
    latitude=latitude,
    longitude=longitude,
    content=content or {"text": "test"},
    retrieved_at=utc_now_iso(),
  )


def test_match_radius_by_category() -> None:
  assert match_radius_m("restaurant") == 250
  assert match_radius_m("park") == 5_000
  assert match_radius_m("city") == 15_000


def test_match_rejects_far_away_document() -> None:
  place = _place()
  far = _doc(
    source_ref="wiki:wrong-city",
    title="Crater Lake",
    source_name="wikipedia",
    latitude=40.7128,  # NYC
    longitude=-74.0060,
    content={"text": "Wrong Crater Lake article"},
  )
  near = _doc(
    source_ref="osm:1",
    title="Crater Lake National Park",
    content={"fee": "Free", "name": "Crater Lake National Park"},
  )
  kept = match_documents(place, [far, near], max_docs=6)
  assert [doc.source_ref for doc in kept] == ["osm:1"]


def test_match_keeps_no_coord_doc_on_name_similarity() -> None:
  place = _place(aliases=("Crater Lake National Park",))
  wiki = _doc(
    source_ref="https://en.wikipedia.org/wiki/Crater_Lake",
    title="Crater Lake",
    source_name="wikipedia",
    latitude=None,
    longitude=None,
    content={"text": "A caldera lake in Oregon."},
  )
  wrong = _doc(
    source_ref="https://en.wikipedia.org/wiki/Unrelated",
    title="Totally Different Place",
    source_name="wikipedia",
    latitude=None,
    longitude=None,
    content={"text": "Nope."},
  )
  kept = match_documents(place, [wiki, wrong], max_docs=6)
  assert [doc.source_ref for doc in kept] == [
    "https://en.wikipedia.org/wiki/Crater_Lake",
  ]


def test_verify_drops_fabricated_source_ref() -> None:
  docs = [
    _doc(source_ref="osm:real", title="Crater Lake", content={"fee": "Free"}),
  ]
  draft = {
    "famous_for": "Deep blue caldera lake",
    "admission_text": "Free",
    "evidence": [
      {
        "field_name": "famous_for",
        "source_name": "wikipedia",
        "source_ref": "https://fake.example/made-up",
      },
      {
        "field_name": "admission_text",
        "source_name": "osm",
        "source_ref": "osm:real",
      },
    ],
    "notes": [],
  }
  facts = verify_facts(draft, docs, category="park")
  assert facts.admission_text == "Free"
  assert facts.famous_for is None
  assert {row.field_name for row in facts.evidence} == {"admission_text"}


def test_verify_drops_out_of_range_price_level() -> None:
  docs = [_doc(source_ref="g:1", title="Cafe", source_name="google_places")]
  draft = {
    "price_level": 9,
    "cuisines": ["italian"],
    "opening_hours_text": ["Mo-Fr 09:00-17:00"],
    "evidence": [
      {"field_name": "price_level", "source_name": "google_places", "source_ref": "g:1"},
      {"field_name": "cuisines", "source_name": "google_places", "source_ref": "g:1"},
      {
        "field_name": "opening_hours_text",
        "source_name": "google_places",
        "source_ref": "g:1",
      },
    ],
    "notes": [],
  }
  facts = verify_facts(draft, docs, category="restaurant")
  assert facts.price_level is None
  assert facts.cuisines == ("italian",)


def test_verify_conflict_prefers_higher_priority_source() -> None:
  docs = [
    _doc(source_ref="osm:1", title="Park", source_name="osm"),
    _doc(source_ref="g:1", title="Park", source_name="google_places"),
  ]
  facts = verify_facts(
    {
      "admission_text": "$30",
      "evidence": [
        {
          "field_name": "admission_text",
          "source_name": "osm",
          "source_ref": "osm:1",
          "value": "Free",
        },
        {
          "field_name": "admission_text",
          "source_name": "google_places",
          "source_ref": "g:1",
          "value": "$30",
        },
      ],
      "notes": [],
    },
    docs,
    category="park",
  )
  assert facts.admission_text == "$30"
  assert facts.evidence[0].source_name == "google_places"
  assert "admission_text: google_places≠osm" in facts.conflicts


def test_completeness_policy() -> None:
  assert completeness_status("park", {}) == "empty"
  assert completeness_status("park", {"famous_for": "Lake"}) == "partial"
  assert (
    completeness_status(
      "park",
      {"famous_for": "Lake", "admission_text": "Free"},
    )
    == "complete"
  )
  assert completeness_status("hike", {"distance_km": 5.0}) == "partial"
  assert completeness_status("hike", {}) == "empty"


def test_facts_are_stale() -> None:
  now = datetime(2026, 7, 27, tzinfo=timezone.utc)
  fresh = PlaceFacts(
    status="partial",
    fetched_at=(now - timedelta(days=1)).isoformat().replace("+00:00", "Z"),
  )
  old = PlaceFacts(
    status="partial",
    fetched_at=(now - timedelta(days=60)).isoformat().replace("+00:00", "Z"),
  )
  assert facts_are_stale(None, now=now) is True
  assert facts_are_stale(fresh, now=now) is False
  assert facts_are_stale(old, now=now) is True


def test_enrich_disabled_without_flag(monkeypatch) -> None:
  monkeypatch.setattr(FeatureFlag, "_flags", {**FeatureFlag._flags, "place_facts": False})
  result = enrich_place_facts(_place(), force=False, persist=False)
  assert result.status == "disabled"


def test_enrich_structured_fill_without_openai(monkeypatch) -> None:
  monkeypatch.setattr(FeatureFlag, "_flags", {**FeatureFlag._flags, "place_facts": True})
  monkeypatch.delenv("OPENAI_API_KEY", raising=False)

  def _fake_fetch(query: FactQuery) -> list[SourceDocument]:
    return [
      _doc(
        source_ref="osm:1",
        title="Crater Lake",
        content={"fee": "Free", "description": "Deep lake"},
      )
    ]

  monkeypatch.setattr(
    "travelplanner.places.facts.enrich.select_tools",
    lambda category: [
      FactTool(
        tool_id="fake",
        description="fake",
        source_name="osm",
        categories=frozenset(),
        cost_class="free",
        requires_setting=None,
        fetch=_fake_fetch,
      )
    ],
  )
  result = enrich_place_facts(_place(), force=True, persist=False)
  assert result.status == "saved"
  assert result.facts is not None
  assert result.facts.admission_text == "Free"
  assert result.facts.famous_for == "Deep lake"
  assert result.facts.source_documents[0].source_ref == "osm:1"
  assert "llm_insights skipped" in " ".join(result.facts.notes)


def test_enrich_tool_raising_is_non_fatal(monkeypatch) -> None:
  monkeypatch.setattr(FeatureFlag, "_flags", {**FeatureFlag._flags, "place_facts": True})
  monkeypatch.delenv("OPENAI_API_KEY", raising=False)

  def _boom(query: FactQuery) -> list[SourceDocument]:
    raise RuntimeError("network down")

  monkeypatch.setattr(
    "travelplanner.places.facts.enrich.select_tools",
    lambda category: [
      FactTool(
        tool_id="boom",
        description="boom",
        source_name="osm",
        categories=frozenset(),
        cost_class="free",
        requires_setting=None,
        fetch=_boom,
      )
    ],
  )
  result = enrich_place_facts(_place(), force=True, persist=False)
  assert result.status == "saved"
  assert result.facts is not None
  assert result.facts.status == "empty"


def test_save_place_facts_preserves_tips(dynamodb) -> None:
  place = _place()
  place = replace(place, tips=("Go early", "Bring layers"))
  save_place(place)

  facts = PlaceFacts(
    status="partial",
    fetched_at=utc_now_iso(),
    famous_for="Caldera lake",
    evidence=(
      FactEvidence(
        field_name="famous_for",
        source_name="wikipedia",
        source_ref="https://en.wikipedia.org/wiki/Crater_Lake",
      ),
    ),
  )
  save_place_facts(place.place_id, facts)

  loaded = load_place(place.place_id)
  assert loaded is not None
  assert loaded.tips == ("Go early", "Bring layers")
  assert loaded.facts is not None
  assert loaded.facts.famous_for == "Caldera lake"
  assert loaded.facts.status == "partial"


def test_overlay_interpretive_keeps_structured_hours() -> None:
  docs = [
    _doc(
      source_ref="g:1",
      title="Cafe",
      source_name="google_places",
      content={"website_url": "https://cafe.example/"},
    )
  ]
  base = verify_facts(
    {
      "website_url": "https://cafe.example/",
      "opening_hours_text": ["Mo-Fr 09:00-17:00"],
      "evidence": [
        {
          "field_name": "website_url",
          "source_name": "google_places",
          "source_ref": "g:1",
        },
        {
          "field_name": "opening_hours_text",
          "source_name": "google_places",
          "source_ref": "g:1",
        },
      ],
      "notes": ["structured fill from source documents"],
    },
    docs,
    category="cafe",
  )
  insights = verify_facts(
    {
      "famous_for": "Neighborhood espresso",
      "highlights": ["Great patio"],
      "caveats": [],
      "recommendations": ["Go early"],
      "evidence": [
        {
          "field_name": "famous_for",
          "source_name": "google_places",
          "source_ref": "g:1",
        },
        {
          "field_name": "highlights",
          "source_name": "google_places",
          "source_ref": "g:1",
        },
        {
          "field_name": "recommendations",
          "source_name": "google_places",
          "source_ref": "g:1",
        },
      ],
      "notes": ["llm_insights ok"],
    },
    docs,
    category="cafe",
  )
  merged = overlay_interpretive_facts(base, insights, category="cafe")
  assert merged.website_url == "https://cafe.example/"
  assert merged.opening_hours_text == ("Mo-Fr 09:00-17:00",)
  assert merged.famous_for == "Neighborhood espresso"
  assert merged.highlights == ("Great patio",)
  assert merged.recommendations == ("Go early",)


def test_save_place_facts_persists_source_documents(dynamodb) -> None:
  from travelplanner.models import StoredFactDocument

  place = _place()
  save_place(place)
  facts = PlaceFacts(
    status="partial",
    fetched_at=utc_now_iso(),
    website_url="https://www.nps.gov/crla/",
    source_documents=(
      StoredFactDocument(
        tool_id="google_place_details",
        source_name="google_places",
        source_ref="ChIJ_crater",
        title="Crater Lake",
        retrieved_at=utc_now_iso(),
        content={"website_url": "https://www.nps.gov/crla/"},
      ),
    ),
  )
  save_place_facts(place.place_id, facts)
  loaded = load_place(place.place_id)
  assert loaded is not None
  assert loaded.facts is not None
  assert loaded.facts.source_documents[0].source_ref == "ChIJ_crater"
  assert loaded.facts.source_documents[0].content["website_url"] == "https://www.nps.gov/crla/"


def test_select_tools_skips_gated_without_key(monkeypatch) -> None:
  monkeypatch.delenv("MINDCASE_API_KEY", raising=False)
  monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
  monkeypatch.delenv("NPS_API_KEY", raising=False)
  tools = select_tools("restaurant")
  ids = {tool.tool_id for tool in tools}
  assert "osm_tags" in ids
  assert "google_place_details" not in ids
  assert "wikipedia_summary" not in ids  # not in restaurant categories


def test_select_tools_includes_wikipedia_for_park(monkeypatch) -> None:
  monkeypatch.delenv("MINDCASE_API_KEY", raising=False)
  monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
  monkeypatch.delenv("NPS_API_KEY", raising=False)
  tools = select_tools("park")
  ids = {tool.tool_id for tool in tools}
  assert ids == {"osm_tags", "wikipedia_summary"}


def test_select_tools_includes_google_when_mindcase_key_set(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "mk_live_test")
  monkeypatch.delenv("NPS_API_KEY", raising=False)
  tools = select_tools("park")
  ids = {tool.tool_id for tool in tools}
  assert "google_place_details" in ids
  assert "osm_tags" in ids


def test_google_maps_row_structured_fill() -> None:
  from travelplanner.places.facts.pipeline.structured import draft_facts_from_documents
  from travelplanner.places.facts.tools.google import _row_to_document

  doc = _row_to_document(
    {
      "businessName": "Loukoumi Taverna",
      "placeId": "ChIJ11iMTW5fwokRYr9z-BtZDr0",
      "website": "https://toloukoumi.com/",
      "phone": "(718) 626-3200",
      "description": "Cozy Greek taverna.",
      "category": "Greek restaurant",
      "allCategories": ["Greek restaurant", "Mediterranean restaurant"],
      "priceRange": "$$",
      "latitude": 40.7707,
      "longitude": -73.9027,
      "openingHours": [
        {"day": "Monday", "hours": "12 to 10 PM"},
        {"day": "Tuesday", "hours": "12 to 10 PM"},
      ],
      "additionalInfo": {"Planning": [{"Accepts reservations": True}]},
    },
    retrieved_at="2026-08-24T00:00:00Z",
  )
  draft = draft_facts_from_documents([doc])
  assert draft is not None
  facts = verify_facts(draft, [doc], category="restaurant")
  assert facts.website_url == "https://toloukoumi.com/"
  assert facts.phone_number == "(718) 626-3200"
  assert facts.opening_hours_text[0].startswith("Monday")
  assert "Greek" in facts.cuisines[0]
  assert facts.price_level == 2
  assert facts.famous_for == "Cozy Greek taverna."
  assert facts.evidence[0].source_name == "google_places"


def test_enrich_uses_google_structured_fill_when_llm_unavailable(monkeypatch) -> None:
  monkeypatch.setattr(FeatureFlag, "_flags", {**FeatureFlag._flags, "place_facts": True})
  monkeypatch.delenv("OPENAI_API_KEY", raising=False)

  from travelplanner.places.facts.tools.google import _row_to_document

  doc = _row_to_document(
    {
      "businessName": "Crater Lake",
      "placeId": "ChIJ_crater",
      "website": "https://www.nps.gov/crla/",
      "description": "Deep caldera lake.",
      "latitude": 42.9446,
      "longitude": -122.1090,
    },
    retrieved_at="2026-08-24T00:00:00Z",
  )

  monkeypatch.setattr(
    "travelplanner.places.facts.enrich.select_tools",
    lambda category: [
      FactTool(
        tool_id="google_place_details",
        description="google",
        source_name="google_places",
        categories=frozenset(),
        cost_class="paid",
        requires_setting=None,
        fetch=lambda query: [doc],
      )
    ],
  )
  result = enrich_place_facts(_place(), force=True, persist=False)
  assert result.status == "saved"
  assert result.facts is not None
  assert result.facts.website_url == "https://www.nps.gov/crla/"
  assert result.facts.famous_for == "Deep caldera lake."
  assert result.facts.source_documents[0].source_ref == "ChIJ_crater"
  assert "llm_insights skipped" in " ".join(result.facts.notes)


def test_enrich_place_facts_step_runs_for_stale_pins(monkeypatch) -> None:
  from travelplanner.flow.context import IngestContext
  from travelplanner.places.facts.enrich import EnrichResult
  from travelplanner.steps.enrich_place_facts import enrich_place_facts_step

  place = _place()
  called: list[str] = []

  def fake_enrich(candidate, *, force=False, persist=True):
    called.append(candidate.place_id)
    facts = PlaceFacts(
      status="partial",
      fetched_at=utc_now_iso(),
      famous_for="Caldera lake",
    )
    return EnrichResult(
      place_id=candidate.place_id,
      status="saved",
      facts=facts,
    )

  monkeypatch.setattr(
    "travelplanner.steps.enrich_place_facts.enrich_place_facts",
    fake_enrich,
  )
  ctx = IngestContext(
    post_url="https://www.instagram.com/reel/abc/",
    user_id="u1",
    place_ids=[place.place_id],
    place_library=[place],
  )
  result = enrich_place_facts_step(ctx)
  assert called == [place.place_id]
  assert result.place_library is not None
  assert result.place_library[0].facts is not None
  assert result.place_library[0].facts.famous_for == "Caldera lake"
