"""Build PlaceMention tuples from a SavedPost."""

from __future__ import annotations

from travelplanner.models import SavedPost
from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace


def _mention_from_place(place: PlatformPlace) -> PlaceMention:
  return PlaceMention(
    place_name=place.place_name,
    city=place.city,
    country=place.country,
    state_province=place.state_province,
    latitude=place.latitude,
    longitude=place.longitude,
  )


def _mention_from_extracted_place(extracted: ExtractedPlace) -> PlaceMention:
  return PlaceMention(
    place_name=extracted.place_name,
    city=extracted.city,
    country=extracted.country,
    state_province=extracted.state_province,
    details=extracted.details,
    tips=extracted.tips,
    tags=extracted.tags,
    parent_place_name=extracted.parent_place_name,
  )


def _parent_mention_from_extracted(extracted: ExtractedPlace) -> PlaceMention | None:
  if not extracted.parent_place_name:
    return None
  return PlaceMention(
    place_name=extracted.parent_place_name,
    state_province=extracted.state_province,
    country=extracted.country,
  )


def mentions_from_post(post: SavedPost) -> tuple[PlaceMention, ...]:
  mentions = [_mention_from_place(place) for place in post.places]
  mentions.extend(_mention_from_extracted_place(extracted) for extracted in post.extracted_places)

  existing_names = {mention.place_name.strip().lower() for mention in mentions}
  parent_names_seen: set[str] = set()
  for extracted in post.extracted_places:
    parent_mention = _parent_mention_from_extracted(extracted)
    if parent_mention is None:
      continue
    parent_key = parent_mention.place_name.strip().lower()
    if parent_key in existing_names or parent_key in parent_names_seen:
      continue
    parent_names_seen.add(parent_key)
    mentions.append(parent_mention)

  return tuple(mentions)
