from __future__ import annotations

import re
import uuid
from dataclasses import replace
from datetime import date, datetime, timezone

from travelplanner.db import places_repo, user_places_repo, visits_repo
from travelplanner.models import Place, Visit
from travelplanner.place_hints import PlaceMention
from travelplanner.places import load_all_places, load_place, locate_mention, upsert_place

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def visit_to_dict(visit: Visit) -> dict:
  return visits_repo.visit_to_dict(visit)


def _visit_from_dict(data: dict) -> Visit:
  return visits_repo.visit_from_dict(data)


def save_visit(visit: Visit) -> None:
  visits_repo.save_visit(visit)


def load_visit(user_id: str, visit_id: str) -> Visit | None:
  return visits_repo.load_visit(user_id, visit_id)


def load_all_visits(user_id: str) -> list[Visit]:
  return visits_repo.load_all_visits(user_id)


def delete_visit(user_id: str, visit_id: str) -> bool:
  return visits_repo.delete_visit(user_id, visit_id)


def delete_all_visits(user_id: str | None = None) -> int:
  return visits_repo.delete_all_visits(user_id)


def list_visits(user_id: str) -> list[Visit]:
  """Newest trip first (by visited_from, then created_at). Undated last among peers."""
  return sorted(
    load_all_visits(user_id),
    key=lambda visit: (visit.visited_from or "", visit.created_at or ""),
    reverse=True,
  )


def visited_place_ids(user_id: str) -> set[str]:
  return {visit.place_id for visit in load_all_visits(user_id)}


def visits_for_place(user_id: str, place_id: str) -> list[Visit]:
  return [visit for visit in load_all_visits(user_id) if visit.place_id == place_id]


def _parse_iso_date(value: str, field_name: str) -> date:
  if not _DATE_RE.match(value):
    raise ValueError(f"{field_name} must be YYYY-MM-DD")
  try:
    return date.fromisoformat(value)
  except ValueError as exc:
    raise ValueError(f"{field_name} is not a valid date") from exc


def _normalize_optional_date(value: str | None) -> str | None:
  if value is None:
    return None
  stripped = value.strip()
  return stripped or None


def _validate_dates(visited_from: str | None, visited_to: str | None) -> None:
  start_raw = _normalize_optional_date(visited_from)
  end_raw = _normalize_optional_date(visited_to)
  if end_raw and not start_raw:
    raise ValueError("visited_from is required when visited_to is set")
  if start_raw is None:
    return
  start = _parse_iso_date(start_raw, "visited_from")
  if end_raw is None:
    return
  end = _parse_iso_date(end_raw, "visited_to")
  if end < start:
    raise ValueError("visited_to must be on or after visited_from")


def ensure_place_for_query(
  place_query: str,
  *,
  city: str | None = None,
  country: str | None = None,
) -> Place:
  """Geocode a free-text destination and upsert into the place library."""
  query = place_query.strip()
  if not query:
    raise ValueError("place_query is required")

  mention = PlaceMention(
    place_name=query,
    city=city.strip() if city else None,
    country=country.strip() if country else None,
  )
  location = locate_mention(mention)
  if location is None:
    raise ValueError(f"Could not find a place matching “{query}”")

  place_id = upsert_place(mention, location, source_post_id=None)
  place = load_place(place_id)
  if place is None:
    raise RuntimeError("Place was upserted but could not be loaded")
  return place


def resolve_place_for_visit(
  *,
  place_id: str | None = None,
  place_query: str | None = None,
  city: str | None = None,
  country: str | None = None,
) -> Place:
  if place_id:
    place = load_place(place_id)
    if place is None:
      raise ValueError(f"Place not found: {place_id}")
    return place

  if place_query and place_query.strip():
    needle = place_query.strip().lower()
    for place in load_all_places():
      names = (place.display_name, *place.aliases)
      if any(name.lower() == needle for name in names):
        return place
    return ensure_place_for_query(
      place_query,
      city=city,
      country=country,
    )

  raise ValueError("Provide place_id or place_query")


def create_visit(
  *,
  user_id: str,
  visited_from: str | None = None,
  visited_to: str | None = None,
  notes: str | None = None,
  place_id: str | None = None,
  place_query: str | None = None,
  city: str | None = None,
  country: str | None = None,
) -> Visit:
  if not user_id:
    raise ValueError("user_id is required")
  start = _normalize_optional_date(visited_from)
  end = _normalize_optional_date(visited_to)
  _validate_dates(start, end)

  visit_id = uuid.uuid4().hex
  place = resolve_place_for_visit(
    place_id=place_id,
    place_query=place_query,
    city=city,
    country=country,
  )

  user_places_repo.link_user_place(user_id, place.place_id, source="manual")

  visit = Visit(
    visit_id=visit_id,
    place_id=place.place_id,
    place_name=place.display_name,
    visited_from=start,
    visited_to=end,
    notes=(notes.strip() if notes and notes.strip() else None),
    created_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    user_id=user_id,
  )
  save_visit(visit)
  return visit


def mark_visited(
  *,
  user_id: str,
  place_id: str,
  visited_from: str | None = None,
) -> Visit:
  """Idempotent visited mark — reuse an existing visit or create one."""
  existing = visits_for_place(user_id, place_id)
  if existing:
    return sorted(
      existing,
      key=lambda visit: (visit.visited_from or "", visit.created_at or ""),
      reverse=True,
    )[0]
  return create_visit(
    user_id=user_id,
    place_id=place_id,
    visited_from=visited_from,
  )


def unmark_visited(*, user_id: str, place_id: str) -> int:
  """Remove all visits for a place (clears visited status). Returns deleted count."""
  deleted = 0
  for visit in visits_for_place(user_id, place_id):
    if delete_visit(user_id, visit.visit_id):
      deleted += 1
  return deleted


def relink_visits(*, user_id: str) -> int:
  """Re-resolve place_id for visits after a place-library rebuild."""
  updated = 0
  for visit in load_all_visits(user_id):
    existing = load_place(visit.place_id)
    if existing is not None:
      continue
    try:
      place = resolve_place_for_visit(place_query=visit.place_name)
    except ValueError:
      continue
    if place.place_id != visit.place_id or place.display_name != visit.place_name:
      save_visit(
        replace(visit, place_id=place.place_id, place_name=place.display_name),
      )
      updated += 1
  return updated
