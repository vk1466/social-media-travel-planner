from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

# Controlled vocabulary for place tags. The LLM extraction picks from this list
# (multi-select); grow it deliberately to avoid drift (e.g. "hike" vs "trail").
TAGS: tuple[str, ...] = (
  "viewpoint",
  "hike",
  "waterfall",
  "beach",
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "museum",
  "market",
  "park",
  "landmark",
  "neighborhood",
  "activity",
  "nature",
)


class Platform(str, Enum):
  INSTAGRAM = "instagram"
  YOUTUBE = "youtube"
  TIKTOK = "tiktok"
  REDDIT = "reddit"


@dataclass(frozen=True)
class Place:
  place_name: str
  city: str | None = None
  country: str | None = None
  latitude: float | None = None
  longitude: float | None = None


@dataclass(frozen=True)
class ExtractedPlace:
  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  details: str | None = None
  tips: tuple[str, ...] = ()
  tags: tuple[str, ...] = ()
  parent_place_name: str | None = None


@dataclass(frozen=True)
class SavedPost:
  post_id: str
  post_url: str
  platform: Platform
  media_kind: str
  caption: str
  hashtags: tuple[str, ...] = ()
  author_handle: str | None = None
  posted_at: str | None = None
  like_count: int | None = None
  comment_count: int | None = None
  top_comments: tuple[str, ...] = ()
  places: tuple[Place, ...] = ()
  extracted_places: tuple[ExtractedPlace, ...] = ()
  place_ids: tuple[str, ...] = ()
  fetched_at: str | None = None


@dataclass(frozen=True)
class PlaceMention:
  """One raw hint (from `Place` or `ExtractedPlace`), normalized to a common
  shape that the place pipeline can geocode and merge, regardless of which
  fetcher or extraction step produced it."""

  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  latitude: float | None = None
  longitude: float | None = None
  details: str | None = None
  tips: tuple[str, ...] = ()
  tags: tuple[str, ...] = ()


@dataclass(frozen=True)
class PlaceLocation:
  """Canonical geography for a place, resolved via the geocoder client.
  `continent` is derived from `country_code` via a static map — geocoders
  rarely return it directly."""

  display_name: str
  continent: str | None = None
  country: str | None = None
  country_code: str | None = None
  state_province: str | None = None
  city: str | None = None
  latitude: float | None = None
  longitude: float | None = None
  provider_place_id: str | None = None
  osm_class: str | None = None
  osm_type: str | None = None


@dataclass(frozen=True)
class CanonicalPlace:
  """One real-world place in the travel library, deduplicated across posts."""

  place_id: str
  display_name: str
  location: PlaceLocation
  aliases: tuple[str, ...] = ()
  tags: tuple[str, ...] = ()
  details: tuple[str, ...] = ()
  tips: tuple[str, ...] = ()
  source_post_ids: tuple[str, ...] = ()
  parent_place_id: str | None = None
