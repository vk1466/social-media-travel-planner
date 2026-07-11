from __future__ import annotations

import os

import pytest


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
