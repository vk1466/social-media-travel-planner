from __future__ import annotations

import json
import math
from dataclasses import replace
from pathlib import Path

from travelplanner import settings
from travelplanner.clients.openai import get_client
from travelplanner.models import CanonicalPlace, SavedPost
from travelplanner.places import (
  DEFAULT_PLACES_DIR,
  load_all_places,
  save_place,
  slugify,
)
from travelplanner.store import DEFAULT_DATA_DIR, load_all_posts

CLUSTER_PROXIMITY_METERS = 25_000

GROUP_NAME_PROMPT = (
  "These place names belong to one travel attraction. Return the single name a "
  "traveler would use for the whole group. Prefer the broadest real place, not a "
  "sub-location, road, or facility."
)


class _UnionFind:
  def __init__(self, place_ids: tuple[str, ...]) -> None:
    self._parent = {place_id: place_id for place_id in place_ids}

  def find(self, place_id: str) -> str:
    root = place_id
    while self._parent[root] != root:
      root = self._parent[root]
    while self._parent[place_id] != root:
      next_id = self._parent[place_id]
      self._parent[place_id] = root
      place_id = next_id
    return root

  def union(self, left: str, right: str) -> None:
    left_root = self.find(left)
    right_root = self.find(right)
    if left_root != right_root:
      self._parent[right_root] = left_root


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  earth_radius_meters = 6_371_000
  phi1, phi2 = math.radians(lat1), math.radians(lat2)
  delta_phi = math.radians(lat2 - lat1)
  delta_lambda = math.radians(lon2 - lon1)
  a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
  return 2 * earth_radius_meters * math.asin(math.sqrt(a))


def _name_tokens(name: str) -> frozenset[str]:
  slug = slugify(name)
  return frozenset(part for part in slug.split("-") if part)


def _is_broader_name_match(name_a: str, name_b: str) -> bool:
  tokens_a = _name_tokens(name_a)
  tokens_b = _name_tokens(name_b)
  if not tokens_a or not tokens_b:
    return False
  shorter, longer = (tokens_a, tokens_b) if len(tokens_a) <= len(tokens_b) else (tokens_b, tokens_a)
  return shorter.issubset(longer) and shorter != longer


def _same_region(left: CanonicalPlace, right: CanonicalPlace) -> bool:
  left_code = (left.location.country_code or "").upper()
  right_code = (right.location.country_code or "").upper()
  if left_code and right_code and left_code != right_code:
    return False
  left_state = (left.location.state_province or "").strip().lower()
  right_state = (right.location.state_province or "").strip().lower()
  if left_state and right_state and left_state != right_state:
    return False
  return True


def _within_cluster_distance(left: CanonicalPlace, right: CanonicalPlace) -> bool:
  left_location = left.location
  right_location = right.location
  if (
    left_location.latitude is None
    or left_location.longitude is None
    or right_location.latitude is None
    or right_location.longitude is None
  ):
    return False
  distance = _haversine_meters(
    left_location.latitude,
    left_location.longitude,
    right_location.latitude,
    right_location.longitude,
  )
  return distance <= CLUSTER_PROXIMITY_METERS


def _place_names(place: CanonicalPlace) -> tuple[str, ...]:
  return (place.display_name, *place.aliases)


def _matches_place_name(place: CanonicalPlace, query_name: str) -> bool:
  query_slug = slugify(query_name)
  if not query_slug:
    return False
  for name in _place_names(place):
    if slugify(name) == query_slug:
      return True
  return False


def _find_place_id_by_name(
  query_name: str,
  places_by_id: dict[str, CanonicalPlace],
  *,
  region_place: CanonicalPlace | None = None,
) -> str | None:
  matches: list[str] = []
  for place_id, place in places_by_id.items():
    if region_place is not None and not _same_region(place, region_place):
      continue
    if _matches_place_name(place, query_name):
      matches.append(place_id)
  if not matches:
    return None
  return min(matches)


def _resolve_post_place_id(
  post: SavedPost,
  place_name: str,
  places_by_id: dict[str, CanonicalPlace],
) -> str | None:
  for place_id in post.place_ids:
    place = places_by_id.get(place_id)
    if place is not None and _matches_place_name(place, place_name):
      return place_id
  return _find_place_id_by_name(place_name, places_by_id)


def _deterministic_elect_root(members: list[CanonicalPlace]) -> CanonicalPlace:
  return min(
    members,
    key=lambda place: (
      len(_name_tokens(place.display_name)),
      -len(place.source_post_ids),
      place.place_id,
    ),
  )


def choose_group_name(member_names: tuple[str, ...]) -> str | None:
  """Best attraction name for a cluster. Returns None to defer to deterministic election."""
  if not member_names:
    return None

  client = get_client()
  if client is None:
    return None

  names_list = "\n".join(f"- {name}" for name in member_names)
  try:
    response = client.chat.completions.create(
      model=settings.openai_model(),
      messages=[
        {"role": "system", "content": GROUP_NAME_PROMPT},
        {"role": "user", "content": names_list},
      ],
      response_format={
        "type": "json_schema",
        "json_schema": {
          "name": "group_name",
          "strict": True,
          "schema": {
            "type": "object",
            "properties": {
              "group_name": {
                "type": "string",
                "description": "The best attraction name for this cluster",
              }
            },
            "required": ["group_name"],
            "additionalProperties": False,
          },
        },
      },
    )
  except Exception:
    return None

  content = response.choices[0].message.content
  if not content:
    return None

  try:
    payload = json.loads(content)
  except json.JSONDecodeError:
    return None

  group_name = payload.get("group_name") if isinstance(payload, dict) else None
  if not isinstance(group_name, str):
    return None
  group_name = group_name.strip()
  return group_name or None


def _cluster_places(
  places_by_id: dict[str, CanonicalPlace],
  posts: list[SavedPost],
) -> _UnionFind:
  place_ids = tuple(places_by_id.keys())
  clusters = _UnionFind(place_ids)

  for post in posts:
    for extracted in post.extracted_places:
      if not extracted.parent_place_name:
        continue
      child_id = _resolve_post_place_id(post, extracted.place_name, places_by_id)
      if child_id is None:
        continue
      child_place = places_by_id[child_id]
      parent_id = _find_place_id_by_name(
        extracted.parent_place_name,
        places_by_id,
        region_place=child_place,
      )
      if parent_id is not None and parent_id != child_id:
        clusters.union(child_id, parent_id)

  for post in posts:
    if not post.places:
      continue
    anchor_id = _resolve_post_place_id(post, post.places[0].place_name, places_by_id)
    if anchor_id is None:
      continue
    for place_id in post.place_ids:
      if place_id != anchor_id:
        clusters.union(place_id, anchor_id)

  place_list = list(places_by_id.values())
  for index, left in enumerate(place_list):
    for right in place_list[index + 1 :]:
      if clusters.find(left.place_id) == clusters.find(right.place_id):
        continue
      if not _same_region(left, right):
        continue
      if not _within_cluster_distance(left, right):
        continue
      if _is_broader_name_match(left.display_name, right.display_name):
        clusters.union(left.place_id, right.place_id)

  return clusters


def _apply_cluster_roots(
  places_by_id: dict[str, CanonicalPlace],
  clusters: _UnionFind,
) -> dict[str, CanonicalPlace]:
  groups: dict[str, list[CanonicalPlace]] = {}
  for place_id in places_by_id:
    root_id = clusters.find(place_id)
    groups.setdefault(root_id, []).append(places_by_id[place_id])

  updated: dict[str, CanonicalPlace] = dict(places_by_id)

  for members in groups.values():
    if len(members) == 1:
      continue

    member_names = tuple(member.display_name for member in members)
    chosen_name = choose_group_name(member_names)
    elected = _deterministic_elect_root(members)

    root = elected
    if chosen_name:
      matched = next(
        (member for member in members if slugify(member.display_name) == slugify(chosen_name)),
        None,
      )
      if matched is not None:
        root = matched
      elif elected.display_name != chosen_name:
        aliases = list(elected.aliases)
        if elected.display_name not in aliases:
          aliases.append(elected.display_name)
        root = replace(
          elected,
          display_name=chosen_name,
          aliases=tuple(dict.fromkeys(aliases)),
        )
        updated[root.place_id] = root

    for member in members:
      if member.place_id == root.place_id:
        new_parent = None
      else:
        new_parent = root.place_id
      if member.parent_place_id != new_parent:
        updated[member.place_id] = replace(member, parent_place_id=new_parent)

    if root.place_id in updated and updated[root.place_id].parent_place_id is not None:
      updated[root.place_id] = replace(updated[root.place_id], parent_place_id=None)

  return updated


def link_places(
  *,
  posts_data_dir: Path = DEFAULT_DATA_DIR,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> None:
  """Recompute every parent_place_id over the whole library. Idempotent."""
  places = load_all_places(data_dir=places_data_dir)
  if not places:
    return

  places_by_id = {place.place_id: replace(place, parent_place_id=None) for place in places}
  posts = load_all_posts(data_dir=posts_data_dir)

  clusters = _cluster_places(places_by_id, posts)
  updated = _apply_cluster_roots(places_by_id, clusters)

  for place_id, place in updated.items():
    original = places_by_id.get(place_id)
    if original is None:
      continue
    if (
      place.parent_place_id != original.parent_place_id
      or place.display_name != original.display_name
      or place.aliases != original.aliases
    ):
      save_place(place, data_dir=places_data_dir)
