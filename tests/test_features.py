"""Tests for config-based feature flags."""

from __future__ import annotations

import pytest

from travelplanner.features import (
  PLACE_FACTS,
  FeatureFlag,
  enabled,
  get,
  register,
  require,
)


def test_place_facts_defaults_off(monkeypatch) -> None:
  monkeypatch.delenv("FEATURE_PLACE_FACTS", raising=False)
  monkeypatch.delenv("PLACE_FACTS_ENABLED", raising=False)
  assert enabled(PLACE_FACTS) is False


def test_canonical_env_enables(monkeypatch) -> None:
  monkeypatch.setenv("FEATURE_PLACE_FACTS", "true")
  monkeypatch.delenv("PLACE_FACTS_ENABLED", raising=False)
  assert enabled(PLACE_FACTS) is True


def test_legacy_env_alias(monkeypatch) -> None:
  monkeypatch.delenv("FEATURE_PLACE_FACTS", raising=False)
  monkeypatch.setenv("PLACE_FACTS_ENABLED", "yes")
  assert enabled(PLACE_FACTS) is True


def test_canonical_env_wins_over_legacy(monkeypatch) -> None:
  monkeypatch.setenv("FEATURE_PLACE_FACTS", "false")
  monkeypatch.setenv("PLACE_FACTS_ENABLED", "true")
  assert enabled(PLACE_FACTS) is False


@pytest.mark.parametrize("raw", ["1", "TRUE", "Yes", "on"])
def test_truthy_values(monkeypatch, raw: str) -> None:
  monkeypatch.setenv("FEATURE_PLACE_FACTS", raw)
  assert enabled(PLACE_FACTS) is True


@pytest.mark.parametrize("raw", ["0", "FALSE", "No", "off"])
def test_falsy_values(monkeypatch, raw: str) -> None:
  monkeypatch.setenv("FEATURE_PLACE_FACTS", raw)
  assert enabled(PLACE_FACTS) is False


def test_invalid_value_raises(monkeypatch) -> None:
  monkeypatch.setenv("FEATURE_PLACE_FACTS", "maybe")
  with pytest.raises(RuntimeError, match="boolean"):
    enabled(PLACE_FACTS)


def test_unknown_flag_raises() -> None:
  with pytest.raises(KeyError, match="unknown feature flag"):
    enabled("not_a_real_flag")


def test_require_when_disabled(monkeypatch) -> None:
  monkeypatch.delenv("FEATURE_PLACE_FACTS", raising=False)
  monkeypatch.delenv("PLACE_FACTS_ENABLED", raising=False)
  with pytest.raises(RuntimeError, match="FEATURE_PLACE_FACTS"):
    require(PLACE_FACTS)


def test_require_when_enabled(monkeypatch) -> None:
  monkeypatch.setenv("FEATURE_PLACE_FACTS", "true")
  require(PLACE_FACTS)  # does not raise


def test_get_returns_spec() -> None:
  spec = get(PLACE_FACTS)
  assert spec.env_var == "FEATURE_PLACE_FACTS"
  assert spec.legacy_env == "PLACE_FACTS_ENABLED"


def test_register_for_tests(monkeypatch) -> None:
  flag = FeatureFlag(key="unit_test_only", default=True, description="temp")
  try:
    register(flag)
    monkeypatch.delenv("FEATURE_UNIT_TEST_ONLY", raising=False)
    assert enabled("unit_test_only") is True
    monkeypatch.setenv("FEATURE_UNIT_TEST_ONLY", "false")
    assert enabled("unit_test_only") is False
  finally:
    from travelplanner import features

    features._FLAGS.pop("unit_test_only", None)


def test_settings_place_facts_delegates(monkeypatch) -> None:
  from travelplanner import settings

  monkeypatch.setenv("FEATURE_PLACE_FACTS", "true")
  assert settings.place_facts_enabled() is True
  monkeypatch.setenv("FEATURE_PLACE_FACTS", "false")
  assert settings.place_facts_enabled() is False
