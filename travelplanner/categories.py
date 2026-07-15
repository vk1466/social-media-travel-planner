"""Attraction category vocab and merge helpers.

Exactly one category per place; zero or more category-scoped attributes.
No subcategory; no dual category.
"""

from __future__ import annotations

CATEGORIES: tuple[str, ...] = (
  "hike",
  "viewpoint",
  "waterfall",
  "beach",
  "park",
  "landmark",
  "museum",
  "market",
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "neighborhood",
)

# Sentinel for library/API filters that match Place.category is None.
UNCATEGORIZED = "uncategorized"

# Category-scoped facets. Grow deliberately — unknown values are dropped on write.
# A value may be both a category (for one pin) and an attribute (on another).
ATTRIBUTES_BY_CATEGORY: dict[str, tuple[str, ...]] = {
  "hike": ("viewpoint", "waterfall", "summit", "loop"),
  "viewpoint": ("hike",),
  "waterfall": ("hike", "viewpoint"),
  "beach": ("hike",),
  "park": (),
  # Climbable / scenic monuments often need hike or viewpoint as a facet.
  "landmark": ("hike", "viewpoint"),
  "museum": (),
  "market": (),
  "restaurant": (),
  "cafe": (),
  "bar": (),
  "hotel": (),
  "neighborhood": (),
}

# Flat union for extract JSON-schema enum (model must pick from this list).
ALL_ATTRIBUTES: tuple[str, ...] = tuple(
  sorted({attr for attrs in ATTRIBUTES_BY_CATEGORY.values() for attr in attrs})
)

# Higher = more specific. Used for sticky merge and Phase 2 ties.
CATEGORY_PRECEDENCE: dict[str, int] = {
  "hike": 3,
  "waterfall": 3,
  "viewpoint": 3,
  "beach": 3,
  "museum": 3,
  "market": 3,
  "restaurant": 3,
  "cafe": 3,
  "bar": 3,
  "hotel": 3,
  "landmark": 2,
  "park": 1,
  "neighborhood": 1,
}


def attribute_allowlist_prompt_lines() -> str:
  """Human-readable allowlist block for the extract system prompt."""
  lines: list[str] = []
  for category in CATEGORIES:
    attrs = ATTRIBUTES_BY_CATEGORY.get(category, ())
    if attrs:
      lines.append(f"- {category}: {', '.join(attrs)}")
    else:
      lines.append(f"- {category}: (none)")
  return "\n".join(lines)


def normalize_category(value: str | None) -> str | None:
  """Return a known category, or None for blank/unknown values."""
  if value is None:
    return None
  text = value.strip().lower()
  if not text or text not in CATEGORIES:
    return None
  return text


def filter_attributes(category: str | None, attrs: tuple[str, ...] | list[str]) -> tuple[str, ...]:
  """Clip attrs to the allowlist for category; never keep attr == category."""
  if category is None:
    return ()
  allowed = set(ATTRIBUTES_BY_CATEGORY.get(category, ()))
  seen: set[str] = set()
  result: list[str] = []
  for raw in attrs:
    attr = raw.strip().lower() if isinstance(raw, str) else ""
    if not attr or attr == category or attr not in allowed or attr in seen:
      continue
    seen.add(attr)
    result.append(attr)
  return tuple(sorted(result))


def resolve_category(
  existing: str | None,
  incoming: str | None,
  votes: dict[str, int] | None = None,
) -> str | None:
  """Pick a single winning category (Phase 1: sticky + precedence; votes unused).

  Rules:
  - empty ← incoming
  - same → keep
  - else: never overwrite specific with broader; broader may upgrade to specific;
    same band → keep existing
  """
  del votes  # Phase 2 will use vote tallies; signature reserved now.
  existing_norm = normalize_category(existing)
  incoming_norm = normalize_category(incoming)
  if existing_norm is None:
    return incoming_norm
  if incoming_norm is None or incoming_norm == existing_norm:
    return existing_norm

  existing_rank = CATEGORY_PRECEDENCE.get(existing_norm, 0)
  incoming_rank = CATEGORY_PRECEDENCE.get(incoming_norm, 0)
  if incoming_rank > existing_rank:
    return incoming_norm
  return existing_norm
