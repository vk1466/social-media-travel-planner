"""Orchestrate place-facts enrichment: tools → match → structured fill → insights → store."""

from __future__ import annotations

import logging
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

from travelplanner.db.places_repo import save_place_facts
from travelplanner.feature_flag import FeatureFlag
from travelplanner.models import Place, PlaceFacts, StoredFactDocument
from travelplanner.places.facts.pipeline.fill import fill_insights_from_documents
from travelplanner.places.facts.pipeline.match import match_documents
from travelplanner.places.facts.pipeline.structured import draft_facts_from_documents
from travelplanner.places.facts.pipeline.verify import overlay_interpretive_facts, verify_facts
from travelplanner.places.facts.tools.catalog import select_tools
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EnrichResult:
  place_id: str
  status: str  # saved | skipped | disabled | unchanged | error
  facts: PlaceFacts | None = None
  note: str = ""


def facts_are_stale(facts: PlaceFacts | None, *, now: datetime | None = None) -> bool:
  """True when missing or fetched_at older than place_facts_ttl_days."""
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
  ttl_days = int(FeatureFlag.get("place_facts_ttl_days", 30))
  return age > timedelta(days=ttl_days)


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
    city=place.location.city,
    state_province=place.location.state_province,
    provider_place_id=place.location.provider_place_id,
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


def _stored_documents(documents: list[SourceDocument]) -> tuple[StoredFactDocument, ...]:
  stored: list[StoredFactDocument] = []
  for document in documents:
    stored.append(
      StoredFactDocument(
        tool_id=document.tool_id,
        source_name=document.source_name,
        source_ref=document.source_ref,
        title=document.title,
        retrieved_at=document.retrieved_at,
        latitude=document.latitude,
        longitude=document.longitude,
        content=dict(document.content),
      )
    )
  return tuple(stored)


def enrich_place_facts(
  place: Place,
  *,
  force: bool = False,
  persist: bool = True,
) -> EnrichResult:
  """Run the facts pipeline for one place. Never raises; fail-soft."""
  if not FeatureFlag.get("place_facts") and not force:
    return EnrichResult(
      place_id=place.place_id,
      status="disabled",
      note="place_facts feature is disabled",
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
  stored_docs = _stored_documents(matched)
  fetched_at = utc_now_iso()
  if not matched:
    empty = PlaceFacts(
      status="empty",
      fetched_at=fetched_at,
      notes=tuple(tool_notes + ["no matching source documents"]),
      source_documents=stored_docs,
    )
    if persist:
      save_place_facts(place.place_id, empty)
    return EnrichResult(
      place_id=place.place_id,
      status="saved",
      facts=empty,
      note="no matching documents",
    )

  draft = draft_facts_from_documents(matched)
  if draft is None:
    empty = PlaceFacts(
      status="empty",
      fetched_at=fetched_at,
      notes=tuple(tool_notes + ["no structured fields in source documents"]),
      source_documents=stored_docs,
    )
    if persist:
      save_place_facts(place.place_id, empty)
    return EnrichResult(
      place_id=place.place_id,
      status="saved",
      facts=empty,
      note="no structured fields",
    )

  facts = verify_facts(
    draft,
    matched,
    category=place.category,
    fetched_at=fetched_at,
  )
  facts = replace(facts, source_documents=stored_docs)

  insight_draft, insight_note = fill_insights_from_documents(
    place,
    matched,
    static_facts=facts,
  )
  if insight_draft is not None:
    insights = verify_facts(
      insight_draft,
      matched,
      category=place.category,
      fetched_at=fetched_at,
    )
    facts = overlay_interpretive_facts(facts, insights, category=place.category)
  combined_notes = tuple(
    dict.fromkeys([*facts.notes, *tool_notes, insight_note])
  )
  facts = replace(facts, notes=combined_notes, source_documents=stored_docs)

  if persist:
    save_place_facts(place.place_id, facts)
  logger.info(
    "place_facts saved place_id=%s status=%s evidence=%d docs=%d",
    place.place_id,
    facts.status,
    len(facts.evidence),
    len(facts.source_documents),
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
