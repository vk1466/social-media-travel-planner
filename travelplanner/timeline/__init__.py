"""Google Maps Timeline / Takeout visit import."""

from __future__ import annotations

from travelplanner.timeline.parse import (
  TimelineFormat,
  TimelineVisit,
  detect_format,
  parse_timeline_bytes,
  parse_timeline_payload,
)
from travelplanner.timeline.chains import chain_brand, is_chain_place
from travelplanner.timeline.semantic_types import (
  category_from_semantic_type,
  classify_semantic,
)
from travelplanner.timeline.skip_reason import SkipReason, classify_skip_reason
from travelplanner.timeline.llm_gate import suggest_unresolved_cluster
from travelplanner.timeline.trips import (
  TravelContext,
  TravelKind,
  TripWindow,
  build_travel_context,
  classify_travel_context,
  infer_home_location,
)

_LAZY_IMPORTS = {
  "TimelineImportResult",
  "VisitCluster",
  "cluster_timeline_visits",
  "clusters_from_dicts",
  "import_timeline_visits",
}


def __getattr__(name: str):
  if name in _LAZY_IMPORTS:
    from travelplanner.personas import timeline_import as mod

    return getattr(mod, name)
  raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
  "TimelineFormat",
  "TimelineImportResult",
  "TimelineVisit",
  "TravelContext",
  "TravelKind",
  "TripWindow",
  "SkipReason",
  "VisitCluster",
  "build_travel_context",
  "category_from_semantic_type",
  "chain_brand",
  "classify_semantic",
  "classify_skip_reason",
  "classify_travel_context",
  "cluster_timeline_visits",
  "clusters_from_dicts",
  "detect_format",
  "import_timeline_visits",
  "infer_home_location",
  "is_chain_place",
  "parse_timeline_bytes",
  "parse_timeline_payload",
  "suggest_unresolved_cluster",
]
