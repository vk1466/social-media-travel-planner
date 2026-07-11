from __future__ import annotations

from functools import lru_cache
from typing import Any

import boto3

from travelplanner import settings


def _client_kwargs() -> dict[str, Any]:
  # Region only — let boto3's default chain pick up keys + session token.
  # Passing access/secret without AWS_SESSION_TOKEN breaks Lambda (temp creds).
  return {"region_name": settings.dynamodb_region()}


@lru_cache(maxsize=1)
def get_dynamodb_resource() -> Any:
  return boto3.resource("dynamodb", **_client_kwargs())


@lru_cache(maxsize=1)
def get_dynamodb_client() -> Any:
  return boto3.client("dynamodb", **_client_kwargs())


def reset_client_cache() -> None:
  """Clear cached resource (used by tests when env/moto changes)."""
  get_dynamodb_resource.cache_clear()
  get_dynamodb_client.cache_clear()
