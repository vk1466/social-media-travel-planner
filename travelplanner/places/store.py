"""Place identity helpers and DynamoDB CRUD / listing."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import replace

from travelplanner.db import places_repo, user_places_repo, user_posts_repo, visits_repo
from travelplanner.db.places_repo import place_from_dict, place_to_dict
from travelplanner.models import Place, PlaceLocation
from travelplanner.store import delete_all_posts

_ADMIN_OSM_TYPES = frozenset({"state", "region", "country", "continent"})

_NON_TRAVEL_OFFICE_TYPES = frozenset({
  "estate_agent",
  "company",
  "insurance",
  "lawyer",
  "accountant",
  "employment_agency",
  "financial",
  "it",
  "advertising_agency",
  "architect",
  "consulting",
  "tax_advisor",
})


def is_visitable_place(location: PlaceLocation) -> bool:
  """Return False for administrative regions and non-travel commercial matches."""
  if location.osm_class == "boundary" and location.osm_type == "administrative":
    return False
  if location.osm_type in _ADMIN_OSM_TYPES:
    return False
  if location.osm_class == "office" and location.osm_type in _NON_TRAVEL_OFFICE_TYPES:
    return False
  display = location.display_name.strip().lower() if location.display_name else ""
  if location.state_province and display == location.state_province.strip().lower():
    return False
  if location.country and display == location.country.strip().lower():
    return False
  return True


_SLUG_INVALID = re.compile(r"[^a-z0-9]+")


def slugify(value: str | None) -> str:
  if not value:
    return ""
  normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
  return _SLUG_INVALID.sub("-", normalized.lower()).strip("-")


def place_key(location: PlaceLocation) -> str:
  parts = [location.country_code, location.state_province, location.city, location.display_name]
  slug_parts = [slugify(part) for part in parts if part]
  return "-".join(part for part in slug_parts if part)


def save_place(place: Place) -> None:
  places_repo.save_place(place)


def load_place(place_id: str) -> Place | None:
  return places_repo.load_place(place_id)


def load_all_places() -> list[Place]:
  return places_repo.load_all_places()


def delete_all_places() -> int:
  """Remove every canonical place. Returns the number deleted."""
  return places_repo.delete_all_places()


def cleanup_all_data() -> tuple[int, int, int]:
  """Delete all shared posts/places, user memberships, visits, and candidates."""
  from travelplanner.db import place_candidates_repo

  posts_deleted = delete_all_posts()
  places_deleted = delete_all_places()
  visits_deleted = visits_repo.delete_all_visits()
  user_posts_repo.delete_all_user_posts()
  user_places_repo.delete_all_user_places()
  place_candidates_repo.delete_all_candidates()
  return posts_deleted, places_deleted, visits_deleted


def _matches_ci(value: str | None, query: str) -> bool:
  return value is not None and value.strip().lower() == query.strip().lower()


def list_places(
  *,
  continent: str | None = None,
  country: str | None = None,
  state_province: str | None = None,
  city: str | None = None,
  category: str | None = None,
  roots_only: bool = False,
  parent_place_id: str | None = None,
  place_ids: list[str] | None = None,
) -> list[Place]:
  if place_ids is not None:
    places = places_repo.batch_get_places(place_ids)
  else:
    places = load_all_places()
  if roots_only:
    places = [place for place in places if place.parent_place_id is None]
  if parent_place_id is not None:
    places = [place for place in places if place.parent_place_id == parent_place_id]
  if continent:
    places = [place for place in places if _matches_ci(place.location.continent, continent)]
  if country:
    places = [
      place
      for place in places
      if _matches_ci(place.location.country, country) or _matches_ci(place.location.country_code, country)
    ]
  if state_province:
    places = [place for place in places if _matches_ci(place.location.state_province, state_province)]
  if city:
    places = [place for place in places if _matches_ci(place.location.city, city)]
  if category:
    from travelplanner.categories import UNCATEGORIZED

    if category.strip().lower() == UNCATEGORIZED:
      places = [place for place in places if place.category is None]
    else:
      places = [place for place in places if place.category == category]
  return sorted(places, key=lambda place: place.display_name)


def unlink_post_from_places(post_id: str) -> int:
  """Remove a post FK from every place's source_post_ids. Returns places updated."""
  updated = 0
  for place in load_all_places():
    if post_id not in place.source_post_ids:
      continue
    save_place(
      replace(
        place,
        source_post_ids=tuple(pid for pid in place.source_post_ids if pid != post_id),
      ),
    )
    updated += 1
  return updated


__all__ = [
  "cleanup_all_data",
  "delete_all_places",
  "is_visitable_place",
  "list_places",
  "load_all_places",
  "load_place",
  "place_from_dict",
  "place_key",
  "place_to_dict",
  "save_place",
  "slugify",
  "unlink_post_from_places",
]
