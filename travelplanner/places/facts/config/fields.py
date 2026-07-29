"""Fillable place-fact fields and their LLM JSON Schema shapes."""

from __future__ import annotations

from typing import Any

# All PlaceFacts scalar/list fields the LLM may fill (excludes provenance).
FILLABLE_FIELDS: tuple[str, ...] = (
  "website_url",
  "phone_number",
  "opening_hours_text",
  "admission_text",
  "famous_for",
  "best_time_to_visit",
  "typical_duration_minutes",
  "cuisines",
  "price_level",
  "reservation_required",
  "distance_km",
  "elevation_gain_m",
  "difficulty",
)

# Stored as tuple[str, ...] on PlaceFacts.
LIST_FIELDS: frozenset[str] = frozenset({"opening_hours_text", "cuisines"})

_STRING: dict[str, Any] = {"type": ["string", "null"]}
_STRING_LIST: dict[str, Any] = {"type": "array", "items": {"type": "string"}}
_INT: dict[str, Any] = {"type": ["integer", "null"]}
_FLOAT: dict[str, Any] = {"type": ["number", "null"]}
_BOOL: dict[str, Any] = {"type": ["boolean", "null"]}
_DIFFICULTY: dict[str, Any] = {
  "type": ["string", "null"],
  "enum": ["easy", "moderate", "hard", None],
}

FIELD_JSON_SCHEMAS: dict[str, dict[str, Any]] = {
  "website_url": _STRING,
  "phone_number": _STRING,
  "opening_hours_text": _STRING_LIST,
  "admission_text": _STRING,
  "famous_for": _STRING,
  "best_time_to_visit": _STRING,
  "typical_duration_minutes": _INT,
  "cuisines": _STRING_LIST,
  "price_level": _INT,
  "reservation_required": _BOOL,
  "distance_km": _FLOAT,
  "elevation_gain_m": _INT,
  "difficulty": _DIFFICULTY,
}
