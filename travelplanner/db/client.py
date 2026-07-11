from __future__ import annotations

from functools import lru_cache
from typing import Any

import boto3

from travelplanner import settings


def _client_kwargs() -> dict[str, Any]:
  kwargs: dict[str, Any] = {"region_name": settings.dynamodb_region()}
  endpoint = settings.dynamodb_endpoint_url()
  if endpoint:
    kwargs["endpoint_url"] = endpoint
    kwargs["aws_access_key_id"] = settings.aws_access_key_id() or "local"
    kwargs["aws_secret_access_key"] = settings.aws_secret_access_key() or "local"
  else:
    access_key = settings.aws_access_key_id()
    secret_key = settings.aws_secret_access_key()
    if access_key and secret_key:
      kwargs["aws_access_key_id"] = access_key
      kwargs["aws_secret_access_key"] = secret_key
  return kwargs


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
