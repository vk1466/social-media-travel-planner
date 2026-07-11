from __future__ import annotations

import json
import re
import uuid
from dataclasses import asdict, replace
from datetime import date, datetime, timezone
from pathlib import Path

from travelplanner.models import Place, Visit
from travelplanner.place_hints import PlaceMention
from travelplanner.places import (
  DEFAULT_PLACES_DIR,
  load_all_places,
  load_place,
  locate_mention,
  upsert_place,
)

DEFAULT_VISITS_DIR = Path("data/visits")

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _visit_path(visit_id: str, data_dir: Path) -> Path:
  return data_dir / f"{visit_id}.json"


def visit_to_dict(visit: Visit) -> dict:
  return asdict(visit)


def _visit_from_dict(data: dict) -> Visit:
  return Visit(
    visit_id=data["visit_id"],
    place_id=data["place_id"],
    place_name=data["place_name"],
    visited_from=data["visited_from"],
    visited_to=data.get("visited_to"),
    notes=data.get("notes"),
    created_at=data.get("created_at"),
  )


def save_visit(visit: Visit, data_dir: Path = DEFAULT_VISITS_DIR) -> Path:
  path = _visit_path(visit.visit_id, data_dir)
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as handle:
    json.dump(visit_to_dict(visit), handle, indent=2, ensure_ascii=False)
    handle.write("\n")
  return path


def load_visit(visit_id: str, data_dir: Path = DEFAULT_VISITS_DIR) -> Visit | None:
  path = _visit_path(visit_id, data_dir)
  if not path.exists():
    return None
  with path.open(encoding="utf-8") as handle:
    return _visit_from_dict(json.load(handle))


def load_all_visits(data_dir: Path = DEFAULT_VISITS_DIR) -> list[Visit]:
  if not data_dir.exists():
    return []
  visits = []
  for path in sorted(data_dir.glob("*.json")):
    with path.open(encoding="utf-8") as handle:
      visits.append(_visit_from_dict(json.load(handle)))
  return visits


def delete_visit(visit_id: str, data_dir: Path = DEFAULT_VISITS_DIR) -> bool:
  path = _visit_path(visit_id, data_dir)
  if not path.exists():
    return False
  path.unlink()
  return True


def delete_all_visits(data_dir: Path = DEFAULT_VISITS_DIR) -> int:
  if not data_dir.exists():
    return 0
  deleted = 0
  for path in data_dir.glob("*.json"):
    path.unlink()
    deleted += 1
  return deleted


def list_visits(data_dir: Path = DEFAULT_VISITS_DIR) -> list[Visit]:
  """Newest trip first (by visited_from, then created_at)."""
  return sorted(
    load_all_visits(data_dir=data_dir),
    key=lambda visit: (visit.visited_from, visit.created_at or ""),
    reverse=True,
  )


def visited_place_ids(data_dir: Path = DEFAULT_VISITS_DIR) -> set[str]:
  return {visit.place_id for visit in load_all_visits(data_dir=data_dir)}


def _parse_iso_date(value: str, field_name: str) -> date:
  if not _DATE_RE.match(value):
    raise ValueError(f"{field_name} must be YYYY-MM-DD")
  try:
    return date.fromisoformat(value)
  except ValueError as exc:
    raise ValueError(f"{field_name} is not a valid date") from exc


def _validate_dates(visited_from: str, visited_to: str | None) -> None:
  start = _parse_iso_date(visited_from, "visited_from")
  if visited_to is None or visited_to == "":
    return
  end = _parse_iso_date(visited_to, "visited_to")
  if end < start:
    raise ValueError("visited_to must be on or after visited_from")


def ensure_place_for_query(
  place_query: str,
  *,
  city: str | None = None,
  country: str | None = None,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> Place:
  """Geocode a free-text destination and upsert into the place library.

  Visits reference places only via Visit.place_id — no visit pseudo-id is
  written into Place.source_post_ids.
  """
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

  place_id = upsert_place(mention, location, source_post_id=None, data_dir=places_data_dir)
  place = load_place(place_id, data_dir=places_data_dir)
  if place is None:
    raise RuntimeError("Place was upserted but could not be loaded")
  return place


def resolve_place_for_visit(
  *,
  place_id: str | None = None,
  place_query: str | None = None,
  city: str | None = None,
  country: str | None = None,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> Place:
  if place_id:
    place = load_place(place_id, data_dir=places_data_dir)
    if place is None:
      raise ValueError(f"Place not found: {place_id}")
    return place

  if place_query and place_query.strip():
    # Prefer an existing library match by display name / alias before geocoding.
    needle = place_query.strip().lower()
    for place in load_all_places(data_dir=places_data_dir):
      names = (place.display_name, *place.aliases)
      if any(name.lower() == needle for name in names):
        return place
    return ensure_place_for_query(
      place_query,
      city=city,
      country=country,
      places_data_dir=places_data_dir,
    )

  raise ValueError("Provide place_id or place_query")


def create_visit(
  *,
  visited_from: str,
  visited_to: str | None = None,
  notes: str | None = None,
  place_id: str | None = None,
  place_query: str | None = None,
  city: str | None = None,
  country: str | None = None,
  visits_data_dir: Path = DEFAULT_VISITS_DIR,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> Visit:
  _validate_dates(visited_from, visited_to)

  visit_id = uuid.uuid4().hex
  place = resolve_place_for_visit(
    place_id=place_id,
    place_query=place_query,
    city=city,
    country=country,
    places_data_dir=places_data_dir,
  )

  visit = Visit(
    visit_id=visit_id,
    place_id=place.place_id,
    place_name=place.display_name,
    visited_from=visited_from,
    visited_to=visited_to or None,
    notes=(notes.strip() if notes and notes.strip() else None),
    created_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  )
  save_visit(visit, data_dir=visits_data_dir)
  return visit


def relink_visits(
  *,
  visits_data_dir: Path = DEFAULT_VISITS_DIR,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> int:
  """Re-resolve place_id for visits after a place-library rebuild.

  Uses the stored place_name snapshot. Returns how many visits were updated.
  """
  updated = 0
  for visit in load_all_visits(data_dir=visits_data_dir):
    existing = load_place(visit.place_id, data_dir=places_data_dir)
    if existing is not None:
      continue
    try:
      place = resolve_place_for_visit(
        place_query=visit.place_name,
        places_data_dir=places_data_dir,
      )
    except ValueError:
      continue
    if place.place_id != visit.place_id or place.display_name != visit.place_name:
      save_visit(
        replace(visit, place_id=place.place_id, place_name=place.display_name),
        data_dir=visits_data_dir,
      )
      updated += 1
  return updated
