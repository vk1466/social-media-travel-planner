"""Per-account ingest limits. Defaults live with user settings."""

from __future__ import annotations

from travelplanner.db import user_settings_repo

DEFAULT_LINK_INGEST_CONCURRENCY = user_settings_repo.DEFAULT_LINK_INGEST_CONCURRENCY


def link_ingest_concurrency(user_id: str) -> int:
  return user_settings_repo.get_ingest_concurrency(user_id)
