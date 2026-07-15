"""Build PlaceMention tuples from a SavedPost."""

from __future__ import annotations

from travelplanner.categories import normalize_category
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
    category=extracted.category,
    attributes=extracted.attributes,
    parent_place_name=extracted.parent_place_name,
  )


def _parent_mention_from_extracted(extracted: ExtractedPlace) -> PlaceMention | None:
  if not extracted.parent_place_name:
    return None
  # Prefer LLM parent_category; leave None so locate/upsert can fill from OSM.
  return PlaceMention(
    place_name=extracted.parent_place_name,
    state_province=extracted.state_province,
    country=extracted.country,
    category=normalize_category(extracted.parent_category),
  )


def _mention_key(mention: PlaceMention) -> str:
  return mention.place_name.strip().lower()


def _merge_mentions(base: PlaceMention, extra: PlaceMention) -> PlaceMention:
  """Combine two mentions of the same place so we geocode/upsert it only once.

  Keeps the richer extraction fields (details, tips, category, parent) while
  backfilling coordinates/region from whichever mention has them (usually the
  platform location tag).
  """
  merged_tips = tuple(dict.fromkeys((*base.tips, *extra.tips)))
  return PlaceMention(
    place_name=base.place_name,
    city=base.city or extra.city,
    country=base.country or extra.country,
    state_province=base.state_province or extra.state_province,
    latitude=base.latitude if base.latitude is not None else extra.latitude,
    longitude=base.longitude if base.longitude is not None else extra.longitude,
    details=base.details or extra.details,
    tips=merged_tips,
    category=base.category or extra.category,
    attributes=base.attributes or extra.attributes,
    parent_place_name=base.parent_place_name or extra.parent_place_name,
  )


def mentions_from_post(post: SavedPost) -> tuple[PlaceMention, ...]:
  """Deduplicated mentions for a post — one entry per distinct place name.

  A platform location tag and an LLM extraction that name the same place are
  merged so the place pipeline never geocodes or upserts the same place twice.
  """
  by_name: dict[str, PlaceMention] = {}
  order: list[str] = []

  def add(mention: PlaceMention) -> None:
    key = _mention_key(mention)
    if not key:
      return
    if key in by_name:
      by_name[key] = _merge_mentions(by_name[key], mention)
    else:
      by_name[key] = mention
      order.append(key)

  for place in post.places:
    add(_mention_from_place(place))
  for extracted in post.extracted_places:
    add(_mention_from_extracted_place(extracted))
  for extracted in post.extracted_places:
    parent_mention = _parent_mention_from_extracted(extracted)
    if parent_mention is not None:
      add(parent_mention)

  return tuple(by_name[key] for key in order)
