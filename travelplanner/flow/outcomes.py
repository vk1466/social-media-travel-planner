from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from travelplanner.models import Place, PlaceLocation
from travelplanner.place_hints import PlaceMention

PlaceOutcomeStatus = Literal["resolved", "low_confidence", "unresolved", "rejected"]


@dataclass
class LocateOutcome:
  status: PlaceOutcomeStatus
  mention: PlaceMention | None = None
  location: PlaceLocation | None = None
  place: Place | None = None
  reason: str | None = None
  match_confidence: float | None = None
