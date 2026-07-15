from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace


class Platform(str, Enum):
  INSTAGRAM = "instagram"
  YOUTUBE = "youtube"
  TIKTOK = "tiktok"
  REDDIT = "reddit"


def make_post_id(platform: Platform, native_post_id: str) -> str:
  """Build the globally unique post primary key: `{platform}:{native_id}`."""
  native = native_post_id.strip()
  if not native:
    raise ValueError("native_post_id is required")
  prefix = f"{platform.value}:"
  if native.startswith(prefix):
    return native
  if ":" in native:
    raise ValueError(f"native_post_id must not include a platform prefix: {native_post_id}")
  return f"{prefix}{native}"


def parse_post_id(post_id: str) -> tuple[Platform, str]:
  """Split a global post_id into `(platform, native_id)`."""
  platform_value, separator, native_id = post_id.partition(":")
  if not separator or not platform_value or not native_id:
    raise ValueError(f"Invalid post_id (expected platform:native): {post_id}")
  return Platform(platform_value), native_id


@dataclass(frozen=True)
class SavedPost:
  """Ingested social post — the Post domain entity.

  `post_id` is the globally unique primary key (`platform:native_id`), suitable
  as a DynamoDB partition key. `place_ids` references Place.place_id values.
  """

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
  places: tuple[PlatformPlace, ...] = ()
  extracted_places: tuple[ExtractedPlace, ...] = ()
  place_ids: tuple[str, ...] = ()
  thumbnail_url: str | None = None
  fetched_at: str | None = None
  reel_summary: str | None = None


@dataclass(frozen=True)
class PlaceLocation:
  """Geography nested on a Place (value object, not a standalone entity)."""

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
class Place:
  """One real-world place in the travel library, deduplicated across posts.

  `source_post_ids` references SavedPost.post_id (global ids).
  `parent_place_id` references another Place.place_id.
  """

  place_id: str
  display_name: str
  location: PlaceLocation
  aliases: tuple[str, ...] = ()
  category: str | None = None
  attributes: tuple[str, ...] = ()
  details: tuple[str, ...] = ()
  tips: tuple[str, ...] = ()
  source_post_ids: tuple[str, ...] = ()
  parent_place_id: str | None = None


@dataclass(frozen=True)
class Visit:
  """One personal trip to a place. Places stay geography; visits hold when.

  `place_id` references Place.place_id. `place_name` is a denormalized snapshot.
  `user_id` scopes the visit to a Clerk (or local) user.
  `visited_from` / `visited_to` are optional — undated visits mean “Been” only.
  """

  visit_id: str
  place_id: str
  place_name: str
  visited_from: str | None = None
  visited_to: str | None = None
  notes: str | None = None
  created_at: str | None = None
  user_id: str = ""


@dataclass(frozen=True)
class PlaceCandidate:
  """Failed or weak place lookup tied to a source post — recoverable without re-fetch.

  Written by v2/v3 pipelines when locate is unresolved or low_confidence.
  `status`: unresolved | low_confidence | resolved
  `hints` retains the PlaceMention used for geocoding so retry needs no Instagram fetch.
  """

  candidate_id: str
  source_post_id: str
  place_name: str
  status: str
  hints: PlaceMention
  last_tried_at: str | None = None
  resolved_place_id: str | None = None


@dataclass(frozen=True)
class IngestFailure:
  """Durable record of an ingest that could not produce a clean saved post.

  One row per `(user_id, post_url)` so repeated attempts update in place and
  `attempts` counts retries. Cleared once the same link ingests successfully.

  `stage`: validation | unsupported | post_id | fetch | place_processing
  `status`: error | unsupported
  """

  failure_id: str
  post_url: str
  user_id: str
  status: str
  stage: str
  error_message: str | None = None
  post_id: str | None = None
  attempts: int = 1
  first_failed_at: str | None = None
  last_failed_at: str | None = None
