"""LLM JSON Schema for the insights pass (interpretive fields + evidence)."""

from __future__ import annotations

from typing import Any

from travelplanner.places.facts.config.fields import FIELD_JSON_SCHEMAS, INTERPRETIVE_FIELDS


def build_insights_schema() -> dict[str, Any]:
  """Strict JSON schema for deduced highlights / caveats / famous-for."""
  properties: dict[str, Any] = {}
  for field_name in sorted(INTERPRETIVE_FIELDS):
    properties[field_name] = FIELD_JSON_SCHEMAS[field_name]
  properties["evidence"] = {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "field_name": {"type": "string"},
        "source_name": {"type": "string"},
        "source_ref": {"type": "string"},
      },
      "required": ["field_name", "source_name", "source_ref"],
      "additionalProperties": False,
    },
  }
  properties["notes"] = {"type": "array", "items": {"type": "string"}}
  required = sorted(INTERPRETIVE_FIELDS) + ["evidence", "notes"]
  return {
    "type": "object",
    "properties": properties,
    "required": required,
    "additionalProperties": False,
  }


def build_fill_schema(category: str | None) -> dict[str, Any]:
  """Deprecated alias — insights schema is not category-scoped."""
  del category
  return build_insights_schema()
