"""Code-side verification for LLM-filled place facts."""

from __future__ import annotations

from typing import Any

from travelplanner.models import FactEvidence, PlaceFacts
from travelplanner.places.facts.categories import completeness_status
from travelplanner.places.facts.fields import FILLABLE_FIELDS, LIST_FIELDS
from travelplanner.places.facts.rules import field_value_ok
from travelplanner.places.facts.sources import source_may_fill, source_priority
from travelplanner.places.facts.types import SourceDocument, utc_now_iso

# One accepted citation: (source_name, source_ref, value)
Citation = tuple[str, str, Any]


def _normalize_comparable(value: Any) -> str:
  if isinstance(value, (list, tuple)):
    return "|".join(str(item).strip().lower() for item in value)
  if isinstance(value, bool):
    return "true" if value else "false"
  if value is None:
    return ""
  return str(value).strip().lower()


def _collect_citations(
  draft: dict[str, Any],
  documents: list[SourceDocument],
) -> dict[str, list[Citation]]:
  """Keep only known refs, allowed sources, and format-valid values."""
  known_refs = {doc.source_ref: doc for doc in documents}
  by_field: dict[str, list[Citation]] = {}

  for item in draft.get("evidence") or []:
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
    if not source_may_fill(source_name, field_name):
      continue
    # Prefer an explicit per-citation value when present (conflict tests / future).
    value = item["value"] if "value" in item else draft.get(field_name)
    if not field_value_ok(field_name, value):
      continue
    by_field.setdefault(field_name, []).append((source_name, source_ref, value))

  return by_field


def _resolve_conflicts(
  by_field: dict[str, list[Citation]],
) -> tuple[dict[str, Any], list[FactEvidence], list[str]]:
  """Pick highest-priority source per field; record value disagreements."""
  values: dict[str, Any] = {}
  evidence: list[FactEvidence] = []
  conflicts: list[str] = []

  for field_name, citations in by_field.items():
    ranked = sorted(citations, key=lambda row: source_priority(row[0]), reverse=True)
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

  return values, evidence, conflicts


def _tuple_str(values: dict[str, Any], field_name: str) -> tuple[str, ...]:
  raw = values.get(field_name)
  if not isinstance(raw, (list, tuple)):
    return ()
  return tuple(str(item) for item in raw)


def _to_place_facts(
  values: dict[str, Any],
  *,
  category: str | None,
  evidence: list[FactEvidence],
  conflicts: list[str],
  notes: list[str],
  fetched_at: str | None,
) -> PlaceFacts:
  field_values: dict[str, Any] = {}
  for field_name in FILLABLE_FIELDS:
    if field_name in LIST_FIELDS:
      field_values[field_name] = _tuple_str(values, field_name)
    else:
      field_values[field_name] = values.get(field_name)

  return PlaceFacts(
    status=completeness_status(category, values),
    fetched_at=fetched_at or utc_now_iso(),
    evidence=tuple(evidence),
    conflicts=tuple(dict.fromkeys(conflicts)),
    notes=tuple(notes),
    **field_values,
  )


def verify_facts(
  draft: dict[str, Any],
  documents: list[SourceDocument],
  *,
  category: str | None,
  fetched_at: str | None = None,
) -> PlaceFacts:
  """Drop fabricated refs / bad formats; resolve conflicts by source priority."""
  by_field = _collect_citations(draft, documents)
  values, evidence, conflicts = _resolve_conflicts(by_field)
  notes = [str(note) for note in (draft.get("notes") or []) if str(note).strip()]
  return _to_place_facts(
    values,
    category=category,
    evidence=evidence,
    conflicts=conflicts,
    notes=notes,
    fetched_at=fetched_at,
  )
