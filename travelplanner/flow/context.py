from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.extract import ContentBundle
from travelplanner.flow.outcomes import LocateOutcome
from travelplanner.models import Place, Platform, SavedPost
from travelplanner.place_hints import PlaceMention


@dataclass
class IngestContext:
  """Mutable pipeline state for social post ingest."""

  post_url: str
  user_id: str
  refresh: bool = False
  platform: Platform | None = None
  resource_type: str | None = None
  shortcode: str | None = None
  raw_payload: dict[str, Any] | None = None
  transcript: str | None = None
  image_text: str | None = None
  content_bundle: ContentBundle | None = None
  post: SavedPost | None = None
  place_ids: list[str] = field(default_factory=list)
  place_outcomes: list[LocateOutcome] = field(default_factory=list)
  place_library: list[Place] | None = None
  error_stage: str | None = None
  error_message: str | None = None


@dataclass
class TimelineContext:
  """Mutable pipeline state for a Timeline visit cluster."""

  latitude: float
  longitude: float
  place_name: str | None = None
  address: str | None = None
  semantic_type: str | None = None
  category: str | None = None
  needs_osm_gate: bool = False
  mention: PlaceMention | None = None
  locate_outcome: LocateOutcome | None = None
  nearby_results: list[GeocodeResult] = field(default_factory=list)
  place: Place | None = None
  place_library: list[Place] | None = None
  error_stage: str | None = None
  error_message: str | None = None
