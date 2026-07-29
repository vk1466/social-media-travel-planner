"""Distance + name gates for place-facts source documents."""

from __future__ import annotations

from travelplanner.feature_flag import FeatureFlag
from travelplanner.models import Place
from travelplanner.places.facts.types import SourceDocument
from travelplanner.places.locate import haversine_meters, name_similarity

NAME_MATCH_THRESHOLD = 0.6

# Category group → match radius (meters)
_RADIUS_BY_CATEGORY: dict[str, int] = {
  "restaurant": 250,
  "cafe": 250,
  "bar": 250,
  "hotel": 250,
  "market": 250,
  "museum": 500,
  "landmark": 500,
  "viewpoint": 500,
  "waterfall": 500,
  "beach": 2_000,
  "hike": 2_000,
  "park": 5_000,
  "lake": 5_000,
  "city": 15_000,
  "neighborhood": 15_000,
}

_DEFAULT_RADIUS_M = 1_000


def match_radius_m(category: str | None) -> int:
  if not category:
    return _DEFAULT_RADIUS_M
  return _RADIUS_BY_CATEGORY.get(category, _DEFAULT_RADIUS_M)


def _name_candidates(place: Place) -> tuple[str, ...]:
  return (place.display_name, *place.aliases)


def _best_name_score(place: Place, title: str) -> float:
  return max(
    (name_similarity(title, candidate) for candidate in _name_candidates(place)),
    default=0.0,
  )


def _document_score(place: Place, document: SourceDocument) -> float:
  """Higher is better. Prefer near+named matches."""
  name_score = _best_name_score(place, document.title)
  place_lat = place.location.latitude
  place_lon = place.location.longitude
  if (
    place_lat is not None
    and place_lon is not None
    and document.latitude is not None
    and document.longitude is not None
  ):
    distance = haversine_meters(
      place_lat,
      place_lon,
      document.latitude,
      document.longitude,
    )
    radius = match_radius_m(place.category)
    # Closer → higher; name boosts rank within the kept set.
    proximity = max(0.0, 1.0 - (distance / max(radius, 1)))
    return proximity * 0.7 + name_score * 0.3
  return name_score


def match_documents(
  place: Place,
  documents: list[SourceDocument],
  *,
  max_docs: int | None = None,
) -> list[SourceDocument]:
  """Keep documents that describe this pin; cap at place_facts_max_docs."""
  if place.location.latitude is None or place.location.longitude is None:
    return []

  radius = match_radius_m(place.category)
  kept: list[SourceDocument] = []
  for document in documents:
    if document.latitude is not None and document.longitude is not None:
      distance = haversine_meters(
        place.location.latitude,
        place.location.longitude,
        document.latitude,
        document.longitude,
      )
      if distance > radius:
        continue
      kept.append(document)
      continue
    # No coordinates (common for Wikipedia) — name gate only.
    if _best_name_score(place, document.title) >= NAME_MATCH_THRESHOLD:
      kept.append(document)

  kept.sort(key=lambda doc: _document_score(place, doc), reverse=True)
  limit = max_docs if max_docs is not None else int(FeatureFlag.get("place_facts_max_docs", 6))
  return kept[: max(1, limit)]
