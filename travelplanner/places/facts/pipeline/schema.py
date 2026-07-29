"""LLM fill JSON Schema builder (category-scoped fields + evidence)."""

from __future__ import annotations

from typing import Any

from travelplanner.places.facts.config.categories import policy_for_category
from travelplanner.places.facts.config.fields import FIELD_JSON_SCHEMAS


def build_fill_schema(category: str | None) -> dict[str, Any]:
  """Strict JSON schema for the LLM fill call (category-scoped fields + evidence)."""
  policy = policy_for_category(category)
  properties: dict[str, Any] = {}
  for field_name in sorted(policy.all_fields):
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
  required = sorted(policy.all_fields) + ["evidence", "notes"]
  return {
    "type": "object",
    "properties": properties,
    "required": required,
    "additionalProperties": False,
  }
