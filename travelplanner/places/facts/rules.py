"""Declarative post-LLM format checks for fillable fact fields."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Literal
from urllib.parse import urlparse

FieldRuleKind = Literal[
  "string",
  "bool",
  "int",
  "number",
  "enum",
  "url",
  "string_list",
]

_HTTP_RE = re.compile(r"^https?://", re.IGNORECASE)


@dataclass(frozen=True)
class FieldRule:
  """One fillable field's allowed shape and bounds."""

  kind: FieldRuleKind
  min_value: float | None = None
  max_value: float | None = None
  min_exclusive: bool = False
  enum_values: frozenset[str] | None = None
  max_item_len: int | None = None


# One rule per fillable field — verify looks up; no per-field if ladder.
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


def _check_string(value: Any, _rule: FieldRule) -> bool:
  return isinstance(value, str) and bool(value.strip())


def _check_bool(value: Any, _rule: FieldRule) -> bool:
  return isinstance(value, bool)


def _check_enum(value: Any, rule: FieldRule) -> bool:
  return isinstance(value, str) and rule.enum_values is not None and value in rule.enum_values


def _check_int(value: Any, rule: FieldRule) -> bool:
  return isinstance(value, int) and not isinstance(value, bool) and _in_range(value, rule)


def _check_number(value: Any, rule: FieldRule) -> bool:
  if isinstance(value, bool) or not isinstance(value, (int, float)):
    return False
  return _in_range(float(value), rule)


def _check_url(value: Any, _rule: FieldRule) -> bool:
  if not isinstance(value, str) or not value.strip():
    return False
  stripped = value.strip()
  if not _HTTP_RE.match(stripped):
    return False
  return bool(urlparse(stripped).netloc)


def _check_string_list(value: Any, rule: FieldRule) -> bool:
  if not isinstance(value, (list, tuple)) or not value:
    return False
  for item in value:
    if not isinstance(item, str) or not item.strip():
      return False
    if rule.max_item_len is not None and len(item.strip()) > rule.max_item_len:
      return False
  return True


_KIND_CHECKERS: dict[FieldRuleKind, Callable[[Any, FieldRule], bool]] = {
  "string": _check_string,
  "bool": _check_bool,
  "enum": _check_enum,
  "int": _check_int,
  "number": _check_number,
  "url": _check_url,
  "string_list": _check_string_list,
}


def field_value_ok(field_name: str, value: Any) -> bool:
  """True when value passes the declarative FIELD_RULES check."""
  if value is None:
    return False
  rule = FIELD_RULES.get(field_name)
  if rule is None:
    return True
  checker = _KIND_CHECKERS.get(rule.kind)
  return checker(value, rule) if checker else False
