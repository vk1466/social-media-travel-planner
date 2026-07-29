"""Tests for in-process feature flags."""

from __future__ import annotations

from travelplanner.features import Features


def test_flags_default_off() -> None:
  assert Features.place_facts is False
  assert Features.extract_image_text is False


def test_place_facts_tuning_constants() -> None:
  assert Features.place_facts_ttl_days == 30
  assert Features.place_facts_max_docs == 6
