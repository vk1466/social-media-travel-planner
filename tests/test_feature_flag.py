"""Tests for in-process feature flags."""

from __future__ import annotations

from travelplanner.feature_flag import FeatureFlag


def test_flags_default_off() -> None:
  assert FeatureFlag.get("place_facts") is False
  assert FeatureFlag.get("extract_image_text") is False
  assert FeatureFlag.get("extract_video_analysis") is False
  assert FeatureFlag.get("extract_reel_frame_text") is False


def test_place_facts_tuning_constants() -> None:
  assert FeatureFlag.get("place_facts_ttl_days") == 30
  assert FeatureFlag.get("place_facts_max_docs") == 6


def test_unknown_defaults_to_false() -> None:
  assert FeatureFlag.get("not_a_real_flag") is False


def test_set_adds_or_updates() -> None:
  try:
    FeatureFlag.set("place_facts", True)
    assert FeatureFlag.get("place_facts") is True
    FeatureFlag.set("unit_test_only", True)
    assert FeatureFlag.get("unit_test_only") is True
  finally:
    FeatureFlag.set("place_facts", False)
    FeatureFlag._flags.pop("unit_test_only", None)
