"""Per-category required/optional fields for place facts."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import urlparse

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

# Higher wins when sources disagree on the same field.
SOURCE_PRIORITY: dict[str, int] = {
  "nps": 40,
  "google_places": 30,
  "osm": 20,
  "wikipedia": 10,
}

# Omit a source → it may fill any field. Otherwise only listed fields win.
SOURCE_FIELD_ALLOWLIST: dict[str, frozenset[str]] = {
  "wikipedia": frozenset({"famous_for", "best_time_to_visit"}),
}

FieldRuleKind = Literal[
  "string",
  "bool",
  "int",
  "number",
  "enum",
  "url",
  "string_list",
]


@dataclass(frozen=True)
class FieldRule:
  """Declarative post-LLM format check for one fillable field."""

  kind: FieldRuleKind
  min_value: float | None = None
  max_value: float | None = None
  min_exclusive: bool = False
  enum_values: frozenset[str] | None = None
  max_item_len: int | None = None


# One rule per fillable field — verify applies these instead of per-field ifs.
FIELD_RULES: dict[str, FieldRule] = {
  "website_url": FieldRule(kind="url"),
  "phone_number": FieldRule(kind="string"),
  "opening_hours_text": FieldRule(kind="string_list", max_item_len=200),
  "admission_text": FieldRule(kind="string"),
  "famous_for": FieldRule(kind="string"),
  "best_time_to_visit": FieldRule(kind="string"),
  "typical_duration_minutes": FieldRule(
    kind="int",
    min_value=0,
    max_value=7 * 24 * 60,
    min_exclusive=True,
  ),
  "cuisines": FieldRule(kind="string_list"),
  "price_level": FieldRule(kind="int", min_value=0, max_value=4),
  "reservation_required": FieldRule(kind="bool"),
  "distance_km": FieldRule(kind="number", min_value=0, max_value=200, min_exclusive=True),
  "elevation_gain_m": FieldRule(kind="int", min_value=0, max_value=9000),
  "difficulty": FieldRule(
    kind="enum",
    enum_values=frozenset({"easy", "moderate", "hard"}),
  ),
}

_HTTP_RE = re.compile(r"^https?://", re.IGNORECASE)

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


def source_priority(source_name: str) -> int:
  return SOURCE_PRIORITY.get(source_name, 0)


def source_may_fill(source_name: str, field_name: str) -> bool:
  allowed = SOURCE_FIELD_ALLOWLIST.get(source_name)
  return allowed is None or field_name in allowed


def _in_range(value: float, rule: FieldRule) -> bool:
  if rule.min_value is not None:
    if rule.min_exclusive:
      if value <= rule.min_value:
        return False
    elif value < rule.min_value:
      return False
  if rule.max_value is not None and value > rule.max_value:
    return False
  return True


def field_value_ok(field_name: str, value: Any) -> bool:
  """True when value passes the declarative FIELD_RULES check."""
  if value is None:
    return False
  rule = FIELD_RULES.get(field_name)
  if rule is None:
    return True

  if rule.kind == "string":
    return isinstance(value, str) and bool(value.strip())

  if rule.kind == "bool":
    return isinstance(value, bool)

  if rule.kind == "enum":
    return isinstance(value, str) and rule.enum_values is not None and value in rule.enum_values

  if rule.kind == "int":
    return isinstance(value, int) and not isinstance(value, bool) and _in_range(value, rule)

  if rule.kind == "number":
    if isinstance(value, bool) or not isinstance(value, (int, float)):
      return False
    return _in_range(float(value), rule)

  if rule.kind == "url":
    if not isinstance(value, str) or not value.strip():
      return False
    stripped = value.strip()
    if not _HTTP_RE.match(stripped):
      return False
    return bool(urlparse(stripped).netloc)

  if rule.kind == "string_list":
    if not isinstance(value, (list, tuple)) or not value:
      return False
    for item in value:
      if not isinstance(item, str) or not item.strip():
        return False
      if rule.max_item_len is not None and len(item.strip()) > rule.max_item_len:
        return False
    return True

  return False


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
