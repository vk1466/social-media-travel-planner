from __future__ import annotations

from openai import OpenAI

from travelplanner import settings

_client: OpenAI | None = None


def get_client() -> OpenAI | None:
  global _client
  api_key = settings.openai_api_key()
  if not api_key:
    return None
  if _client is None:
    _client = OpenAI(api_key=api_key)
  return _client
