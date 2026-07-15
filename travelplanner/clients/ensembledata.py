from __future__ import annotations

from typing import Any

from ensembledata.api import EDClient

from travelplanner import settings


def get_client() -> EDClient:
  return EDClient(settings.ensembledata_token())


def fetch_post_info_and_comments(*, code: str, num_comments: int) -> dict[str, Any]:
  """Fetch Instagram post metadata and optionally the top N comment bodies."""
  result = get_client().instagram.post_info_and_comments(
    code=code,
    num_comments=num_comments,
  )
  return result.data


def fetch_user_info(*, username: str) -> dict[str, Any]:
  """Resolve a public Instagram username to profile metadata (includes user id)."""
  result = get_client().instagram.user_info(username=username)
  return result.data


def fetch_user_posts(
  *,
  user_id: int,
  depth: int,
  chunk_size: int,
) -> dict[str, Any]:
  """Fetch recent posts for a numeric Instagram user id."""
  result = get_client().instagram.user_posts(
    user_id=user_id,
    depth=depth,
    chunk_size=chunk_size,
  )
  return result.data
