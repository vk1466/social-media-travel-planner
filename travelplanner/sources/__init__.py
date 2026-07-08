from __future__ import annotations

from collections.abc import Callable

from travelplanner.models import Platform, SavedPost
from travelplanner.sources.instagram import fetch_instagram_post

PLATFORM_FETCHERS: dict[Platform, Callable[[str], SavedPost]] = {
  Platform.INSTAGRAM: fetch_instagram_post,
}
