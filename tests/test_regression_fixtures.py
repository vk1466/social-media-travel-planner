"""Regression fixture shape checks for Timeline skip-list and extract validation."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_timeline_skip_list_fixture_shape() -> None:
  path = ROOT / "docs" / "timeline-backfill-skip-list.json"
  data = json.loads(path.read_text(encoding="utf-8"))
  assert data["clusters"] == 202
  assert data["visits_parsed"] == 384
  buckets = data["buckets"]
  assert isinstance(buckets, dict)
  expected = {"home", "unresolved", "kept", "routine", "review", "chain"}
  assert expected.issubset(buckets.keys())
  for name, rows in buckets.items():
    assert isinstance(rows, list), name
    assert data["counts"][name] == len(rows)
  # Spot-check a kept cluster has coordinates for replay.
  kept = buckets["kept"][0]
  assert "lat" in kept and "lon" in kept


def test_extract_validation_fixture_shape() -> None:
  path = ROOT / "docs" / "extract-validation.json"
  data = json.loads(path.read_text(encoding="utf-8"))
  assert "summary" in data
  assert "posts" in data
  assert data["summary"]["posts"] == len(data["posts"])
  assert len(data["posts"]) >= 1
  assert "post_id" in data["posts"][0]
