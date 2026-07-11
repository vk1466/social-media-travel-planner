"""Convert between Python dicts and DynamoDB-safe attribute values."""

from __future__ import annotations

from decimal import Decimal
from typing import Any


def to_dynamo(value: Any) -> Any:
  """Recursively convert floats to Decimal; drop None values from maps."""
  if value is None:
    return None
  if isinstance(value, float):
    return Decimal(str(value))
  if isinstance(value, dict):
    return {key: to_dynamo(item) for key, item in value.items() if item is not None}
  if isinstance(value, (list, tuple)):
    return [to_dynamo(item) for item in value]
  return value


def from_dynamo(value: Any) -> Any:
  """Recursively convert Decimal back to int/float for domain models."""
  if isinstance(value, list):
    return [from_dynamo(item) for item in value]
  if isinstance(value, dict):
    return {key: from_dynamo(item) for key, item in value.items()}
  if isinstance(value, Decimal):
    if value % 1 == 0:
      return int(value)
    return float(value)
  return value
