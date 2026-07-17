from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PlatformPlaceSchema(BaseModel):
  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  latitude: float | None = None
  longitude: float | None = None


class ExtractedPlaceSchema(BaseModel):
  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  details: str | None = None
  tips: list[str] = Field(default_factory=list)
  category: str | None = None
  attributes: list[str] = Field(default_factory=list)
  parent_place_name: str | None = None
  parent_category: str | None = None


class SavedPostSchema(BaseModel):
  post_id: str
  post_url: str
  platform: str
  media_kind: str
  caption: str
  hashtags: list[str] = Field(default_factory=list)
  author_handle: str | None = None
  posted_at: str | None = None
  like_count: int | None = None
  comment_count: int | None = None
  top_comments: list[str] = Field(default_factory=list)
  places: list[PlatformPlaceSchema] = Field(default_factory=list)
  extracted_places: list[ExtractedPlaceSchema] = Field(default_factory=list)
  place_ids: list[str] = Field(default_factory=list)
  thumbnail_url: str | None = None
  fetched_at: str | None = None
  reel_summary: str | None = None


class PlaceLocationSchema(BaseModel):
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


class PlaceSchema(BaseModel):
  place_id: str
  display_name: str
  location: PlaceLocationSchema
  aliases: list[str] = Field(default_factory=list)
  category: str | None = None
  attributes: list[str] = Field(default_factory=list)
  details: list[str] = Field(default_factory=list)
  tips: list[str] = Field(default_factory=list)
  source_post_ids: list[str] = Field(default_factory=list)
  parent_place_id: str | None = None


class PlaceDetailSchema(BaseModel):
  place: PlaceSchema
  source_posts: list[SavedPostSchema] = Field(default_factory=list)
  parent: PlaceSchema | None = None
  children: list[PlaceSchema] = Field(default_factory=list)


class IngestRequest(BaseModel):
  links: list[str]
  refresh: bool = False


class IngestResponse(BaseModel):
  job_id: str


LinkStatus = Literal[
  "pending",
  "fetching",
  "saved",
  "linked",
  "skipped",
  "unsupported",
  "error",
]


class JobLinkSchema(BaseModel):
  post_url: str
  status: LinkStatus
  post_id: str | None = None
  error_message: str | None = None


class JobCountsSchema(BaseModel):
  pending: int = 0
  fetching: int = 0
  saved: int = 0
  linked: int = 0
  skipped: int = 0
  unsupported: int = 0
  error: int = 0


class JobSchema(BaseModel):
  job_id: str
  status: Literal["running", "done"]
  refresh: bool
  kind: str = "link_ingest"
  mark_visited: bool = False
  username: str | None = None
  counts: JobCountsSchema
  links: list[JobLinkSchema]


class InstagramImportRequest(BaseModel):
  username: str = Field(..., min_length=1)


class TimelineVisitInput(BaseModel):
  latitude: float
  longitude: float
  visited_from: str | None = None
  visited_to: str | None = None
  place_name: str | None = None
  google_place_id: str | None = None
  semantic_type: str | None = None
  address: str | None = None
  source_format: str | None = None
  visit_count: int = 1


class TimelineUploadUrlResponse(BaseModel):
  url: str
  key: str


class TimelineImportStartRequest(BaseModel):
  """Start an async Timeline import after the client uploaded clusters to S3."""

  format: str = "unknown"
  s3_key: str = Field(..., min_length=1)
  total_places: int = Field(..., ge=1)
  home_latitude: float | None = None
  home_longitude: float | None = None


class TimelineImportResultSchema(BaseModel):
  format: str
  visits_parsed: int
  unique_places: int
  imported: int
  queued_for_review: int = 0
  skipped_existing: int
  skipped_unresolved: int
  skipped_limit: int
  skipped_home: int = 0
  skipped_semantic: int = 0
  skipped_llm: int = 0
  failed: int
  place_names: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
  detail: str


class VisitSchema(BaseModel):
  visit_id: str
  place_id: str
  place_name: str
  visited_from: str | None = None
  visited_to: str | None = None
  notes: str | None = None
  created_at: str | None = None
  user_id: str | None = None
  source: str | None = "manual"

class VisitCreateRequest(BaseModel):
  visited_from: str | None = None
  visited_to: str | None = None
  notes: str | None = None
  place_id: str | None = None
  place_query: str | None = None
  city: str | None = None
  country: str | None = None


class VisitsCleanupRequest(BaseModel):
  """Clear visit history for clean reimport / reset."""

  scope: Literal["timeline", "all"] = "timeline"
  unlink_places: bool = True


class VisitsCleanupResultSchema(BaseModel):
  visits_deleted: int
  places_unlinked: int = 0


class VisitDetailSchema(BaseModel):
  visit: VisitSchema
  place: PlaceSchema | None = None


class TimelineReviewDetailSchema(BaseModel):
  visit: VisitSchema
  place: PlaceSchema | None = None
  suggestion: str | None = None
  suggestion_reason: str | None = None


class VisitedStatusSchema(BaseModel):
  place_id: str
  visited: bool
  visit: VisitSchema | None = None


class MaintenanceResultSchema(BaseModel):
  posts_deleted: int | None = None
  places_deleted: int | None = None
  visits_deleted: int | None = None


class AdminMeSchema(BaseModel):
  is_admin: bool


class LocateDebugRequest(BaseModel):
  place_name: str = Field(..., min_length=1)
  city: str | None = None
  state_province: str | None = None
  country: str | None = None
  parent_place_name: str | None = None
  latitude: float | None = None
  longitude: float | None = None


class LocateDebugLocationSchema(BaseModel):
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


class LocateDebugResultSchema(BaseModel):
  status: str
  location: LocateDebugLocationSchema | None = None
  queries_tried: list[str] = Field(default_factory=list)
  notes: list[str] = Field(default_factory=list)
  match_confidence: float | None = None
  category: str | None = None
  provider: str | None = None


class LocateDebugQuerySchema(BaseModel):
  place_name: str
  city: str | None = None
  state_province: str | None = None
  country: str | None = None
  parent_place_name: str | None = None
  latitude: float | None = None
  longitude: float | None = None


class LocateDebugResponse(BaseModel):
  query: LocateDebugQuerySchema
  result: LocateDebugResultSchema


class PlaceCandidateHintsSchema(BaseModel):
  place_name: str
  city: str | None = None
  country: str | None = None
  state_province: str | None = None
  latitude: float | None = None
  longitude: float | None = None
  details: str | None = None
  tips: list[str] = Field(default_factory=list)
  category: str | None = None
  attributes: list[str] = Field(default_factory=list)
  parent_place_name: str | None = None


class PlaceCandidateSchema(BaseModel):
  candidate_id: str
  source_post_id: str
  place_name: str
  status: str
  hints: PlaceCandidateHintsSchema
  last_tried_at: str | None = None
  resolved_place_id: str | None = None


class PlaceCandidateListResponse(BaseModel):
  candidates: list[PlaceCandidateSchema]
  count: int
