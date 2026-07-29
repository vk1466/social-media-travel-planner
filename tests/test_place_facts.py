"""Unit tests for type-specific place facts (Phase 1)."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Any

from travelplanner.db.places_repo import save_place_facts
from travelplanner.feature_flag import FeatureFlag
from travelplanner.models import FactEvidence, Place, PlaceFacts, PlaceLocation
from travelplanner.places.facts.catalog import select_tools
from travelplanner.places.facts.enrich import enrich_place_facts, facts_are_stale
from travelplanner.places.facts.match import match_documents, match_radius_m
from travelplanner.places.facts.categories import completeness_status
from travelplanner.places.facts.types import FactQuery, FactTool, SourceDocument, utc_now_iso
from travelplanner.places.facts.verify import verify_facts
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


def test_enrich_fail_soft_no_openai(monkeypatch) -> None:
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
  assert result.status == "error"
  assert "OPENAI_API_KEY" in result.note


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


def test_select_tools_skips_gated_without_key(monkeypatch) -> None:
  monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
  monkeypatch.delenv("NPS_API_KEY", raising=False)
  tools = select_tools("restaurant")
  ids = {tool.tool_id for tool in tools}
  assert "osm_tags" in ids
  assert "google_place_details" not in ids
  assert "wikipedia_summary" not in ids  # not in restaurant categories


def test_select_tools_includes_wikipedia_for_park(monkeypatch) -> None:
  monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
  monkeypatch.delenv("NPS_API_KEY", raising=False)
  tools = select_tools("park")
  ids = {tool.tool_id for tool in tools}
  assert ids == {"osm_tags", "wikipedia_summary"}
