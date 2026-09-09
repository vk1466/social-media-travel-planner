from __future__ import annotations

import os
import threading

import pytest
from moto.dynamodb.models import DynamoDBBackend

# Moto's in-memory DynamoDB update_item is not thread-safe for concurrent item updates
# (condition check and mutation are not atomic across OS threads).
# Synchronize update_item so multi-threaded tests reflect real DynamoDB's atomic condition checks.
_MOTO_UPDATE_LOCK = threading.Lock()
_ORIG_MOTO_UPDATE_ITEM = DynamoDBBackend.update_item


def _threadsafe_moto_update_item(self, *args, **kwargs):
  with _MOTO_UPDATE_LOCK:
    return _ORIG_MOTO_UPDATE_ITEM(self, *args, **kwargs)


DynamoDBBackend.update_item = _threadsafe_moto_update_item


@pytest.fixture()
def dynamodb(monkeypatch):
  """Isolated in-memory DynamoDB tables via moto for each test."""
  monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
  monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
  monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
  monkeypatch.setenv("DYNAMODB_REGION", "us-east-1")
  monkeypatch.setenv("DYNAMODB_STAGE", "test")
  monkeypatch.setenv("AUTH_DISABLED", "1")

  from moto import mock_aws

  from travelplanner.db.client import reset_client_cache
  from travelplanner.db.tables import ensure_tables

  with mock_aws():
    reset_client_cache()
    ensure_tables()
    yield
    reset_client_cache()


@pytest.fixture()
def auth_headers() -> dict[str, str]:
  return {"X-User-Id": "user-a"}


@pytest.fixture(autouse=True)
def _default_auth_env(monkeypatch):
  """Ensure API tests without dynamodb fixture still allow unauthenticated-dev mode."""
  if "AUTH_DISABLED" not in os.environ:
    monkeypatch.setenv("AUTH_DISABLED", "1")
