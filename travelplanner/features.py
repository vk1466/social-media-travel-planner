"""Config-based feature flags.

Declare every product feature here (default off), then gate call sites with:

  from travelplanner.features import enabled, PLACE_FACTS

  if enabled(PLACE_FACTS):
    ...

Each flag reads ``FEATURE_<KEY>`` from the environment (e.g. ``FEATURE_PLACE_FACTS=true``).
Unknown flag keys raise ``KeyError`` so typos fail loudly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

_TRUE = frozenset({"1", "true", "yes", "on"})
_FALSE = frozenset({"0", "false", "no", "off"})


@dataclass(frozen=True)
class FeatureFlag:
  """A named product feature gated by config."""

  key: str
  default: bool = False
  description: str = ""
  # Older env names still honored when FEATURE_<KEY> is unset.
  legacy_env: str | None = None

  @property
  def env_var(self) -> str:
    return f"FEATURE_{self.key.upper()}"


# Stable ids used at call sites — add a constant when introducing a new flag.
PLACE_FACTS = "place_facts"
EXTRACT_IMAGE_TEXT = "extract_image_text"

_FLAGS: dict[str, FeatureFlag] = {
  PLACE_FACTS: FeatureFlag(
    key=PLACE_FACTS,
    default=False,
    description="Type-specific place facts enrichment (lazy, not during ingest)",
    legacy_env="PLACE_FACTS_ENABLED",
  ),
  EXTRACT_IMAGE_TEXT: FeatureFlag(
    key=EXTRACT_IMAGE_TEXT,
    default=False,
    description="OCR image/carousel text before place extract (Instagram)",
  ),
}


def register(flag: FeatureFlag) -> FeatureFlag:
  """Register a flag (tests / plugins). Prefer editing ``_FLAGS`` for product features."""
  if flag.key in _FLAGS:
    raise ValueError(f"feature flag already registered: {flag.key!r}")
  _FLAGS[flag.key] = flag
  return flag


def get(flag: str) -> FeatureFlag:
  try:
    return _FLAGS[flag]
  except KeyError as exc:
    known = ", ".join(sorted(_FLAGS)) or "(none)"
    raise KeyError(f"unknown feature flag {flag!r}; known: {known}") from exc


def enabled(flag: str) -> bool:
  """True when the feature is on for this process."""
  spec = get(flag)
  raw = os.getenv(spec.env_var, "").strip()
  if not raw and spec.legacy_env:
    raw = os.getenv(spec.legacy_env, "").strip()
  if not raw:
    return spec.default
  value = raw.lower()
  if value in _TRUE:
    return True
  if value in _FALSE:
    return False
  raise RuntimeError(
    f"{spec.env_var} must be a boolean (true/false), got {raw!r}"
  )


def require(flag: str) -> None:
  """Raise ``RuntimeError`` when the feature is off."""
  if not enabled(flag):
    spec = get(flag)
    raise RuntimeError(
      f"feature {flag!r} is disabled; set {spec.env_var}=true to enable"
    )
