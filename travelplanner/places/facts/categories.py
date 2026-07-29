"""Per-category required/optional fields and completeness."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


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
