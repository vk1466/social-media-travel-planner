"""Tests for in-process feature flags."""

from __future__ import annotations

import pytest

from travelplanner.features import FeatureFlag


def test_flags_default_off() -> None:
  assert FeatureFlag.place_facts is False
  assert FeatureFlag.extract_image_text is False


def test_place_facts_tuning_constants() -> None:
  assert FeatureFlag.place_facts_ttl_days == 30
  assert FeatureFlag.place_facts_max_docs == 6


def test_get_by_name() -> None:
  assert FeatureFlag.get("place_facts") is False
  assert FeatureFlag.get("place_facts_ttl_days") == 30


def test_get_unknown_raises() -> None:
  with pytest.raises(KeyError, match="unknown feature flag"):
    FeatureFlag.get("not_a_real_flag")
