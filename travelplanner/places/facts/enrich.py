"""Orchestrate place-facts enrichment: tools → match → LLM → verify → store."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

from travelplanner import settings
from travelplanner.db.places_repo import save_place_facts
from travelplanner.features import PLACE_FACTS, enabled as feature_enabled
from travelplanner.models import Place, PlaceFacts
from travelplanner.places.facts.catalog import select_tools
from travelplanner.places.facts.llm_fill import fill_facts_from_documents
from travelplanner.places.facts.match import match_documents
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso
from travelplanner.places.facts.verify import verify_facts

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EnrichResult:
  place_id: str
  status: str  # saved | skipped | disabled | unchanged | error
  facts: PlaceFacts | None = None
  note: str = ""


def facts_are_stale(facts: PlaceFacts | None, *, now: datetime | None = None) -> bool:
  """True when missing or fetched_at older than PLACE_FACTS_TTL_DAYS."""
  if facts is None or not facts.fetched_at:
    return True
  try:
    fetched = datetime.fromisoformat(facts.fetched_at.replace("Z", "+00:00"))
  except ValueError:
    return True
  if fetched.tzinfo is None:
    fetched = fetched.replace(tzinfo=timezone.utc)
  current = now or datetime.now(timezone.utc)
  age = current - fetched
  return age > timedelta(days=settings.place_facts_ttl_days())


def _build_query(place: Place) -> FactQuery | None:
  lat = place.location.latitude
  lon = place.location.longitude
  if lat is None or lon is None:
    return None
  if not place.category:
    return None
  return FactQuery(
    place_id=place.place_id,
    display_name=place.display_name,
    category=place.category,
    latitude=float(lat),
    longitude=float(lon),
    aliases=place.aliases,
    country=place.location.country,
    country_code=place.location.country_code,
  )


def _fetch_all(query: FactQuery) -> tuple[list[SourceDocument], list[str]]:
  notes: list[str] = []
  documents: list[SourceDocument] = []
  for tool in select_tools(query.category):
    try:
      fetched = tool.fetch(query)
    except Exception as exc:
      note = f"{tool.tool_id} error: {exc}"
      logger.warning("place_facts tool failed tool_id=%s error=%s", tool.tool_id, exc)
      notes.append(note)
      continue
    documents.extend(fetched)
  return documents, notes


def enrich_place_facts(
  place: Place,
  *,
  force: bool = False,
  persist: bool = True,
) -> EnrichResult:
  """Run the facts pipeline for one place. Never raises; fail-soft."""
  if not feature_enabled(PLACE_FACTS) and not force:
    return EnrichResult(
      place_id=place.place_id,
      status="disabled",
      note=f"{PLACE_FACTS} feature is disabled",
    )

  if not force and not facts_are_stale(place.facts):
    return EnrichResult(
      place_id=place.place_id,
      status="unchanged",
      facts=place.facts,
      note="facts still fresh",
    )

  query = _build_query(place)
  if query is None:
    return EnrichResult(
      place_id=place.place_id,
      status="skipped",
      note="place needs a pin and category",
    )

  raw_docs, tool_notes = _fetch_all(query)
  matched = match_documents(place, raw_docs)
  if not matched:
    empty = PlaceFacts(
      status="empty",
      fetched_at=utc_now_iso(),
      notes=tuple(tool_notes + ["no matching source documents"]),
    )
    if persist:
      save_place_facts(place.place_id, empty)
    return EnrichResult(
      place_id=place.place_id,
      status="saved",
      facts=empty,
      note="no matching documents",
    )

  draft, fill_note = fill_facts_from_documents(place, matched)
  if draft is None:
    return EnrichResult(
      place_id=place.place_id,
      status="error",
      note=fill_note,
    )

  facts = verify_facts(
    draft,
    matched,
    category=place.category,
    fetched_at=utc_now_iso(),
  )
  # Attach tool / fill notes without dropping verify notes.
  combined_notes = tuple(dict.fromkeys([*facts.notes, *tool_notes, fill_note]))
  facts = replace(facts, notes=combined_notes)

  if persist:
    save_place_facts(place.place_id, facts)
  logger.info(
    "place_facts saved place_id=%s status=%s evidence=%d",
    place.place_id,
    facts.status,
    len(facts.evidence),
  )
  return EnrichResult(
    place_id=place.place_id,
    status="saved",
    facts=facts,
    note=f"saved status={facts.status}",
  )


def enrich_places(
  *,
  place_id: str | None = None,
  category: str | None = None,
  limit: int = 10,
  force: bool = False,
) -> list[EnrichResult]:
  """CLI helper: enrich one place or the first N places of a category."""
  from travelplanner.places.store import load_all_places, load_place

  if place_id:
    place = load_place(place_id)
    if place is None:
      return [
        EnrichResult(place_id=place_id, status="error", note="place not found"),
      ]
    return [enrich_place_facts(place, force=force)]

  places = load_all_places()
  selected: list[Place] = []
  for place in places:
    if category and place.category != category:
      continue
    if place.location.latitude is None or place.location.longitude is None:
      continue
    if not place.category:
      continue
    selected.append(place)
    if len(selected) >= max(1, limit):
      break

  return [enrich_place_facts(place, force=force) for place in selected]
