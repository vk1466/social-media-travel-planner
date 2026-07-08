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
