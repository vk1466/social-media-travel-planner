"""Post persistence facade — DynamoDB-backed shared Posts table."""

from __future__ import annotations

from travelplanner.db.posts_repo import (
  batch_get_posts,
  delete_all_posts,
  delete_post,
  has_post,
  load_all_posts,
  load_post,
  load_post_by_id,
  post_from_dict,
  post_to_dict,
  save_post,
)
from travelplanner.models import Platform, SavedPost

__all__ = [
  "SavedPost",
  "Platform",
  "batch_get_posts",
  "delete_all_posts",
  "delete_post",
  "has_post",
  "load_all_posts",
  "load_post",
  "load_post_by_id",
  "post_from_dict",
  "post_to_dict",
  "save_post",
]
