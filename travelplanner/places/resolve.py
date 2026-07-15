from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.categories import (
  category_from_osm,
  filter_attributes,
  resolve_category,
)
from travelplanner.models import Place, PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places.store import load_all_places, load_place, place_key, save_place
from travelplanner.places.locate import haversine_meters, name_similarity

logger = logging.getLogger(__name__)

NEAR_DUPLICATE_METERS = 50
NAME_COMPATIBLE = 0.55
ALIAS_REGION_MATCH = 0.72


def _names_compatible(mention_name: str, place: Place) -> bool:
  candidates = (place.display_name, *place.aliases)
  return any(name_similarity(mention_name, candidate) >= NAME_COMPATIBLE for candidate in candidates)


def _same_region(location: PlaceLocation, place: Place) -> bool:
  left = place.location
  if location.country_code and left.country_code:
    if location.country_code != left.country_code:
      return False
  elif location.country and left.country:
    if location.country.strip().lower() != left.country.strip().lower():
      return False
  if location.state_province and left.state_province:
    if location.state_province.strip().lower() != left.state_province.strip().lower():
      return False
  return True


def find_existing_place(
  key: str,
  location: PlaceLocation,
  mention: PlaceMention,
  library: list[Place] | None = None,
) -> Place | None:
  """Name-aware merge: exact key, same-region alias, or near+compatible name."""
  existing = load_place(key)
  if existing is not None:
    return existing

  places = library if library is not None else load_all_places()

  # Alias / name match in the same region (even if coords differ).
  best_alias: Place | None = None
  best_alias_score = 0.0
  for place in places:
    if not _same_region(location, place):
      continue
    score = max(
      [
        name_similarity(mention.place_name, place.display_name),
        *(name_similarity(mention.place_name, alias) for alias in place.aliases),
      ]
    )
    if score >= ALIAS_REGION_MATCH and score > best_alias_score:
      best_alias = place
      best_alias_score = score
  if best_alias is not None:
    return best_alias

  # Proximity only when names agree.
  if location.latitude is None or location.longitude is None:
    return None
  for place in places:
    place_location = place.location
    if place_location.latitude is None or place_location.longitude is None:
      continue
    distance = haversine_meters(
      location.latitude,
      location.longitude,
      place_location.latitude,
      place_location.longitude,
    )
    if distance <= NEAR_DUPLICATE_METERS and _names_compatible(mention.place_name, place):
      return place
  return None


def _effective_category(mention: PlaceMention, location: PlaceLocation) -> str | None:
  """LLM category first; OSM class/type fills gaps (esp. synthesized parents)."""
  if mention.category:
    return mention.category
  return category_from_osm(location.osm_class, location.osm_type)


def _merge_place(
  existing: Place,
  mention: PlaceMention,
  location: PlaceLocation,
  source_post_id: str | None,
) -> Place:
  aliases = list(existing.aliases)
  if mention.place_name != existing.display_name and mention.place_name not in aliases:
    aliases.append(mention.place_name)

  details = list(existing.details)
  if mention.details and mention.details not in details:
    details.append(mention.details)

  tips = list(existing.tips)
  for tip in mention.tips:
    if tip not in tips:
      tips.append(tip)

  incoming_category = _effective_category(mention, location)
  winning_category = resolve_category(existing.category, incoming_category)
  attr_pool: list[str] = list(existing.attributes) + list(mention.attributes)
  if (
    existing.category
    and winning_category
    and existing.category != winning_category
  ):
    attr_pool.append(existing.category)
  attributes = filter_attributes(winning_category, tuple(attr_pool))

  source_post_ids = existing.source_post_ids
  if source_post_id and source_post_id not in source_post_ids:
    source_post_ids = (*source_post_ids, source_post_id)

  return replace(
    existing,
    aliases=tuple(aliases),
    details=tuple(details),
    tips=tuple(tips),
    category=winning_category,
    attributes=attributes,
    source_post_ids=source_post_ids,
  )


def _new_place(
  place_id: str,
  mention: PlaceMention,
  location: PlaceLocation,
  source_post_id: str | None,
) -> Place:
  aliases = () if mention.place_name == location.display_name else (mention.place_name,)
  category = resolve_category(None, _effective_category(mention, location))
  return Place(
    place_id=place_id,
    display_name=location.display_name,
    location=location,
    aliases=aliases,
    category=category,
    attributes=filter_attributes(category, mention.attributes),
    details=(mention.details,) if mention.details else (),
    tips=tuple(dict.fromkeys(mention.tips)),
    source_post_ids=(source_post_id,) if source_post_id else (),
  )


def upsert_place(
  mention: PlaceMention,
  location: PlaceLocation,
  source_post_id: str | None = None,
  *,
  library: list[Place] | None = None,
) -> str:
  key = place_key(location)
  existing = find_existing_place(key, location, mention, library=library)
  if existing is not None:
    place = _merge_place(existing, mention, location, source_post_id)
    logger.info(
      "place merge mention=%r into place_id=%s display=%r post_id=%s",
      mention.place_name,
      place.place_id,
      place.display_name,
      source_post_id,
    )
  else:
    place = _new_place(key, mention, location, source_post_id)
    logger.info(
      "place create place_id=%s display=%r mention=%r post_id=%s",
      place.place_id,
      place.display_name,
      mention.place_name,
      source_post_id,
    )
  save_place(place)
  return place.place_id
