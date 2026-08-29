"""Source trust policy: conflict priority and per-source field allowlists."""

from __future__ import annotations

# Higher wins when sources disagree on the same field.
SOURCE_PRIORITY: dict[str, int] = {
  "nps": 40,
  "google_places": 30,
  "osm": 20,
  "wikipedia": 10,
}

# Omit a source → it may fill any field. Otherwise only listed fields win.
SOURCE_FIELD_ALLOWLIST: dict[str, frozenset[str]] = {
  "wikipedia": frozenset(
    {
      "famous_for",
      "best_time_to_visit",
      "typical_duration_minutes",
      "highlights",
      "caveats",
      "recommendations",
    }
  ),
}


def source_priority(source_name: str) -> int:
  return SOURCE_PRIORITY.get(source_name, 0)


def source_may_fill(source_name: str, field_name: str) -> bool:
  allowed = SOURCE_FIELD_ALLOWLIST.get(source_name)
  return allowed is None or field_name in allowed
