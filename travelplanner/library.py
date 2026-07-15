"""User-scoped library queries over shared Posts/Places + membership tables."""

from __future__ import annotations

from travelplanner.db import places_repo, user_places_repo, user_posts_repo
from travelplanner.models import Place, Platform, SavedPost
from travelplanner.places import list_places
from travelplanner.store import batch_get_posts


def list_user_posts(user_id: str, platform: Platform | None = None) -> list[SavedPost]:
  post_ids = user_posts_repo.list_user_post_ids(user_id)
  posts = batch_get_posts(post_ids)
  if platform is not None:
    posts = [post for post in posts if post.platform == platform]
  return sorted(posts, key=lambda post: post.fetched_at or "", reverse=True)


def user_owns_post(user_id: str, post_id: str) -> bool:
  return user_posts_repo.user_has_post(user_id, post_id)


def list_user_places(
  user_id: str,
  *,
  continent: str | None = None,
  country: str | None = None,
  state_province: str | None = None,
  city: str | None = None,
  category: str | None = None,
  roots_only: bool = False,
  parent_place_id: str | None = None,
) -> list[Place]:
  place_ids = user_places_repo.list_user_place_ids(user_id)
  return list_places(
    continent=continent,
    country=country,
    state_province=state_province,
    city=city,
    category=category,
    roots_only=roots_only,
    parent_place_id=parent_place_id,
    place_ids=place_ids,
  )


def get_user_place(user_id: str, place_id: str) -> Place | None:
  if place_id not in set(user_places_repo.list_user_place_ids(user_id)):
    # Still allow loading a place that is a child of a user place, or linked via parent.
    # For detail views we require membership on the place itself.
    return None
  return places_repo.load_place(place_id)
