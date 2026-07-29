"""URL collection helpers for ingest personas."""

from __future__ import annotations

from travelplanner.links import detect_platform


def is_supported_ingest_url(post_url: str) -> bool:
  """True when the URL maps to a platform with an ingest pipeline."""
  platform = detect_platform(post_url.strip())
  return platform is not None and platform.value == "instagram"
