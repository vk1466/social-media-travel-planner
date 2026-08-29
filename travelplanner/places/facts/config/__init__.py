"""Declarative place-facts config: fields, categories, format rules, source trust."""

from __future__ import annotations

from travelplanner.places.facts.config.categories import (
  CategoryFieldPolicy,
  completeness_status,
  policy_for_category,
)
from travelplanner.places.facts.config.fields import (
  FIELD_JSON_SCHEMAS,
  FILLABLE_FIELDS,
  INTERPRETIVE_FIELDS,
  LIST_FIELDS,
)
from travelplanner.places.facts.config.rules import FIELD_RULES, FieldRule, field_value_ok
from travelplanner.places.facts.config.sources import (
  SOURCE_FIELD_ALLOWLIST,
  SOURCE_PRIORITY,
  source_may_fill,
  source_priority,
)

__all__ = [
  "CategoryFieldPolicy",
  "FIELD_JSON_SCHEMAS",
  "FIELD_RULES",
  "FILLABLE_FIELDS",
  "INTERPRETIVE_FIELDS",
  "FieldRule",
  "LIST_FIELDS",
  "SOURCE_FIELD_ALLOWLIST",
  "SOURCE_PRIORITY",
  "completeness_status",
  "field_value_ok",
  "policy_for_category",
  "source_may_fill",
  "source_priority",
]
