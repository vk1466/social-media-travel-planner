"""Per-category required/optional fields for place facts."""

from __future__ import annotations

from dataclasses import dataclass
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

_STRING = {"type": ["string", "null"]}
_STRING_LIST = {
  "type": "array",
  "items": {"type": "string"},
}
_INT = {"type": ["integer", "null"]}
_FLOAT = {"type": ["number", "null"]}
_BOOL = {"type": ["boolean", "null"]}
_DIFFICULTY = {"type": ["string", "null"], "enum": ["easy", "moderate", "hard", None]}

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


@dataclass(frozen=True)
class CategoryFieldPolicy:
  required: frozenset[str]
  optional: frozenset[str]

  @property
  def all_fields(self) -> frozenset[str]:
    return self.required | self.optional


# One row per category (plan table). hike has no required fields in Phase 1.
_CATEGORY_POLICIES: dict[str, CategoryFieldPolicy] = {
  "restaurant": CategoryFieldPolicy(
    required=frozenset({"cuisines", "opening_hours_text"}),
    optional=frozenset(
      {
        "price_level",
        "reservation_required",
        "website_url",
        "phone_number",
        "famous_for",
      }
    ),
  ),
  "cafe": CategoryFieldPolicy(
    required=frozenset({"cuisines", "opening_hours_text"}),
    optional=frozenset(
      {
        "price_level",
        "reservation_required",
        "website_url",
        "phone_number",
        "famous_for",
      }
    ),
  ),
  "bar": CategoryFieldPolicy(
    required=frozenset({"cuisines", "opening_hours_text"}),
    optional=frozenset(
      {
        "price_level",
        "reservation_required",
        "website_url",
        "phone_number",
        "famous_for",
      }
    ),
  ),
  "hotel": CategoryFieldPolicy(
    required=frozenset({"website_url"}),
    optional=frozenset({"price_level", "phone_number", "famous_for"}),
  ),
  "park": CategoryFieldPolicy(
    required=frozenset({"admission_text", "famous_for"}),
    optional=frozenset(
      {
        "opening_hours_text",
        "best_time_to_visit",
        "typical_duration_minutes",
        "website_url",
      }
    ),
  ),
  "museum": CategoryFieldPolicy(
    required=frozenset({"opening_hours_text", "admission_text"}),
    optional=frozenset(
      {
        "famous_for",
        "typical_duration_minutes",
        "website_url",
        "phone_number",
      }
    ),
  ),
  "landmark": CategoryFieldPolicy(
    required=frozenset({"famous_for"}),
    optional=frozenset(
      {
        "opening_hours_text",
        "admission_text",
        "best_time_to_visit",
        "typical_duration_minutes",
      }
    ),
  ),
  "market": CategoryFieldPolicy(
    required=frozenset({"opening_hours_text"}),
    optional=frozenset({"famous_for", "best_time_to_visit", "website_url"}),
  ),
  "hike": CategoryFieldPolicy(
    required=frozenset(),
    optional=frozenset(
      {
        "distance_km",
        "elevation_gain_m",
        "difficulty",
        "typical_duration_minutes",
        "best_time_to_visit",
      }
    ),
  ),
  "beach": CategoryFieldPolicy(
    required=frozenset({"best_time_to_visit"}),
    optional=frozenset({"admission_text", "famous_for", "typical_duration_minutes"}),
  ),
  "lake": CategoryFieldPolicy(
    required=frozenset({"best_time_to_visit"}),
    optional=frozenset({"admission_text", "famous_for", "typical_duration_minutes"}),
  ),
  "waterfall": CategoryFieldPolicy(
    required=frozenset({"best_time_to_visit"}),
    optional=frozenset({"admission_text", "famous_for", "typical_duration_minutes"}),
  ),
  "viewpoint": CategoryFieldPolicy(
    required=frozenset({"best_time_to_visit"}),
    optional=frozenset({"admission_text", "famous_for", "typical_duration_minutes"}),
  ),
  "city": CategoryFieldPolicy(
    required=frozenset({"famous_for"}),
    optional=frozenset({"best_time_to_visit"}),
  ),
  "neighborhood": CategoryFieldPolicy(
    required=frozenset({"famous_for"}),
    optional=frozenset({"best_time_to_visit"}),
  ),
}

_DEFAULT_POLICY = CategoryFieldPolicy(
  required=frozenset(),
  optional=frozenset({"famous_for", "best_time_to_visit", "website_url"}),
)


def policy_for_category(category: str | None) -> CategoryFieldPolicy:
  if not category:
    return _DEFAULT_POLICY
  return _CATEGORY_POLICIES.get(category, _DEFAULT_POLICY)


def field_is_present(field_name: str, values: dict[str, Any]) -> bool:
  value = values.get(field_name)
  if value is None:
    return False
  if isinstance(value, (list, tuple)):
    return len(value) > 0
  if isinstance(value, str):
    return bool(value.strip())
  return True


def completeness_status(category: str | None, values: dict[str, Any]) -> str:
  """all required → complete; some filled → partial; none → empty."""
  policy = policy_for_category(category)
  required_present = sum(1 for name in policy.required if field_is_present(name, values))
  optional_present = sum(1 for name in policy.optional if field_is_present(name, values))
  any_present = required_present + optional_present > 0
  if policy.required and required_present == len(policy.required):
    return "complete"
  if any_present:
    return "partial"
  return "empty"


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
  properties["notes"] = _STRING_LIST
  required = sorted(policy.all_fields) + ["evidence", "notes"]
  return {
    "type": "object",
    "properties": properties,
    "required": required,
    "additionalProperties": False,
  }
