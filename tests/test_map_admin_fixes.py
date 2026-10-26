"""Tests for map basemap configuration, Vercel API rewrite routing, and admin access control."""

import json
import re
from pathlib import Path
from fastapi.testclient import TestClient

from server.app import app
from server import auth


def test_vercel_rewrites_preserve_api_and_rewrite_spa() -> None:
  vercel_path = Path(__file__).resolve().parent.parent / "frontend" / "vercel.json"
  assert vercel_path.is_file(), "frontend/vercel.json must exist"

  with open(vercel_path, "r", encoding="utf-8") as f:
    config = json.load(f)

  rewrites = config.get("rewrites", [])
  assert len(rewrites) >= 2, "rewrites should handle API and SPA"

  # Find API rewrites and SPA rewrite
  api_rewrites = [r for r in rewrites if r["source"].startswith("/api")]
  spa_rewrites = [r for r in rewrites if r["destination"] == "/index.html"]

  assert len(api_rewrites) >= 1, "Must have an explicit rewrite proxying /api"
  assert len(spa_rewrites) == 1, "Must have an SPA rewrite to /index.html"

  spa_pattern = re.compile(f"^{spa_rewrites[0]['source']}$")

  # /api routes must NOT be caught by SPA rewrite
  assert not spa_pattern.match("/api/admin/places/candidates")
  assert not spa_pattern.match("/api/admin/users")
  assert not spa_pattern.match("/api/places")
  assert not spa_pattern.match("/api/posts")

  # Frontend app routes MUST be caught by SPA rewrite
  assert spa_pattern.match("/")
  assert spa_pattern.match("/map")
  assert spa_pattern.match("/library")
  assert spa_pattern.match("/admin")
  assert spa_pattern.match("/place/kr-seoul-ikseondong-hanok-village")


def test_admin_api_returns_401_without_token(monkeypatch) -> None:
  # In production auth mode (auth not disabled)
  monkeypatch.setattr("travelplanner.settings.auth_disabled", lambda: False)
  client = TestClient(app)
  response = client.get("/api/admin/places/candidates")
  assert response.status_code == 401
  assert response.json()["detail"] == "Missing Authorization bearer token"


def test_admin_api_returns_403_for_non_admin(monkeypatch) -> None:
  monkeypatch.setattr("travelplanner.settings.admin_user_ids", lambda: frozenset({"admin-user-123"}))
  client = TestClient(app)
  response = client.get("/api/admin/places/candidates", headers={"X-User-Id": "non-admin-user"})
  assert response.status_code == 403
  assert response.json()["detail"] == "Admin access required"

