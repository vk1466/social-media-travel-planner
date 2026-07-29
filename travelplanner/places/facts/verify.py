"""Code-side verification for LLM-filled place facts."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from travelplanner.models import FactEvidence, PlaceFacts
from travelplanner.places.facts.schema import FILLABLE_FIELDS, completeness_status
from travelplanner.places.facts.types import SourceDocument, utc_now_iso

# Structured fields: higher priority wins conflicts.
_SOURCE_PRIORITY = {
  "nps": 40,
  "google_places": 30,
  "osm": 20,
  "wikipedia": 10,
}

# Wikipedia may only win prose fields.
_PROSE_FIELDS = frozenset({"famous_for", "best_time_to_visit"})

_DIFFICULTY = frozenset({"easy", "moderate", "hard"})
_HTTP_RE = re.compile(r"^https?://", re.IGNORECASE)


def _source_priority(source_name: str) -> int:
  return _SOURCE_PRIORITY.get(source_name, 0)


def _normalize_comparable(value: Any) -> str:
  if isinstance(value, (list, tuple)):
    return "|".join(str(item).strip().lower() for item in value)
  if isinstance(value, bool):
    return "true" if value else "false"
  if value is None:
    return ""
  return str(value).strip().lower()


def _format_ok(field_name: str, value: Any) -> bool:
  if value is None:
    return False
  if field_name == "price_level":
    return isinstance(value, int) and 0 <= value <= 4
  if field_name == "website_url":
    if not isinstance(value, str) or not value.strip():
      return False
    if not _HTTP_RE.match(value.strip()):
      return False
    parsed = urlparse(value.strip())
    return bool(parsed.netloc)
  if field_name == "opening_hours_text":
    if not isinstance(value, (list, tuple)) or not value:
      return False
    return all(isinstance(line, str) and 0 < len(line.strip()) <= 200 for line in value)
  if field_name == "cuisines":
    if not isinstance(value, (list, tuple)) or not value:
      return False
    return all(isinstance(item, str) and item.strip() for item in value)
  if field_name == "difficulty":
    return isinstance(value, str) and value in _DIFFICULTY
  if field_name == "distance_km":
    return isinstance(value, (int, float)) and 0 < float(value) <= 200
  if field_name == "elevation_gain_m":
    return isinstance(value, int) and 0 <= value <= 9000
  if field_name == "typical_duration_minutes":
    return isinstance(value, int) and 0 < value <= 7 * 24 * 60
  if field_name in {"phone_number", "admission_text", "famous_for", "best_time_to_visit"}:
    return isinstance(value, str) and bool(value.strip())
  if field_name == "reservation_required":
    return isinstance(value, bool)
  return value is not None


def verify_facts(
  draft: dict[str, Any],
  documents: list[SourceDocument],
  *,
  category: str | None,
  fetched_at: str | None = None,
) -> PlaceFacts:
  """Drop fabricated refs / bad formats; resolve conflicts by source priority."""
  known_refs = {doc.source_ref: doc for doc in documents}
  evidence_raw = draft.get("evidence") or []
  notes = [str(note) for note in (draft.get("notes") or []) if str(note).strip()]

  # field → list of (source_name, source_ref, value) from cited evidence
  by_field: dict[str, list[tuple[str, str, Any]]] = {}
  for item in evidence_raw:
    if not isinstance(item, dict):
      continue
    field_name = item.get("field_name")
    source_name = item.get("source_name")
    source_ref = item.get("source_ref")
    if not isinstance(field_name, str) or field_name not in FILLABLE_FIELDS:
      continue
    if not isinstance(source_ref, str) or source_ref not in known_refs:
      continue
    if not isinstance(source_name, str) or not source_name.strip():
      source_name = known_refs[source_ref].source_name
    # Prefer an explicit per-citation value when present (conflict tests / future).
    value = item["value"] if "value" in item else draft.get(field_name)
    if not _format_ok(field_name, value):
      continue
    # Wikipedia never wins structured fields.
    if source_name == "wikipedia" and field_name not in _PROSE_FIELDS:
      continue
    by_field.setdefault(field_name, []).append((source_name, source_ref, value))

  values: dict[str, Any] = {}
  evidence: list[FactEvidence] = []
  conflicts: list[str] = []

  for field_name, citations in by_field.items():
    # Prefer highest-priority source; detect value disagreements.
    ranked = sorted(citations, key=lambda row: _source_priority(row[0]), reverse=True)
    winner_name, winner_ref, winner_value = ranked[0]
    winner_cmp = _normalize_comparable(winner_value)
    for other_name, _other_ref, other_value in ranked[1:]:
      if _normalize_comparable(other_value) != winner_cmp:
        conflicts.append(f"{field_name}: {winner_name}≠{other_name}")
        break
    values[field_name] = winner_value
    evidence.append(
      FactEvidence(
        field_name=field_name,
        source_name=winner_name,
        source_ref=winner_ref,
      )
    )

  # Fields present in draft with evidence already handled; ignore uncited values.
  status = completeness_status(category, values)

  def _tuple_str(field: str) -> tuple[str, ...]:
    raw = values.get(field)
    if not isinstance(raw, (list, tuple)):
      return ()
    return tuple(str(item) for item in raw)

  return PlaceFacts(
    status=status,
    fetched_at=fetched_at or utc_now_iso(),
    website_url=values.get("website_url"),
    phone_number=values.get("phone_number"),
    opening_hours_text=_tuple_str("opening_hours_text"),
    admission_text=values.get("admission_text"),
    famous_for=values.get("famous_for"),
    best_time_to_visit=values.get("best_time_to_visit"),
    typical_duration_minutes=values.get("typical_duration_minutes"),
    cuisines=_tuple_str("cuisines"),
    price_level=values.get("price_level"),
    reservation_required=values.get("reservation_required"),
    distance_km=values.get("distance_km"),
    elevation_gain_m=values.get("elevation_gain_m"),
    difficulty=values.get("difficulty"),
    evidence=tuple(evidence),
    conflicts=tuple(dict.fromkeys(conflicts)),
    notes=tuple(notes),
  )

