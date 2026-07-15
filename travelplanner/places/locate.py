"""Locate place mentions via multi-candidate ranking + parent geographic bias."""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from difflib import SequenceMatcher

from travelplanner.clients import geocoder
from travelplanner.clients.geocoder import GeocodeResult, Viewbox
from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places.constants import COUNTRY_CODE_TO_CONTINENT

logger = logging.getLogger(__name__)

HIGH_CONFIDENCE = 0.72
LOW_CONFIDENCE = 0.45
# Ask LLM when top-2 scores are this close (or top is below HIGH).
LLM_AMBIGUITY_MARGIN = 0.12
CANDIDATE_LIMIT = 5
# ~28 km half-span — enough for a national park / state park vicinity.
PARENT_VIEWBOX_HALF_SPAN = 0.25
# Soft distance preference to parent / IG coords (meters).
NEAR_ANCHOR_METERS = 40_000
# Hard reject when far from parent and a nearer alternative exists.
FAR_FROM_PARENT_METERS = 80_000

_ADMIN_CATEGORIES = frozenset({"administrative"})
_PREFERRED_CATEGORIES = frozenset(
  {
    "attraction",
    "natural",
    "water",
    "waterway",
    "man_made",
    "food",
    "lodging",
  }
)
# Settlements (Banff, Cannon Beach) are visitable but lose to a specific POI.
_SETTLEMENT_CATEGORIES = frozenset({"place"})
_BAD_CATEGORIES = frozenset({"office", "commercial", "parking"})
_LOW_TRUST_CATEGORIES = frozenset({"highway", "building", "amenity"})

# Tokens that change the place *type* when appended to a landmark name.
_TYPE_CHANGING_SUFFIXES = frozenset(
  {
    "drive",
    "rd",
    "road",
    "st",
    "street",
    "ave",
    "avenue",
    "blvd",
    "boulevard",
    "ln",
    "lane",
    "way",
    "ct",
    "court",
    "hwy",
    "highway",
    "inn",
    "hotel",
    "motel",
    "lodge",
    "resort",
    "parking",
    "lot",
    "garage",
    "realty",
    "office",
  }
)


@dataclass(frozen=True)
class LocateDebugResult:
  """Structured locate outcome for debug / admin tooling (no side effects)."""

  status: str  # resolved | low_confidence | unresolved
  location: PlaceLocation | None = None
  match_confidence: float | None = None
  category: str | None = None
  provider: str | None = None
  queries_tried: tuple[str, ...] = ()
  notes: tuple[str, ...] = ()


def _name_query_variants(place_name: str) -> tuple[str, ...]:
  """OSM often indexes possessive names without apostrophes (Angels Landing)."""
  variants: list[str] = []
  seen: set[str] = set()
  for candidate in (
    place_name,
    place_name.replace("\u2019", "'").replace("'", ""),  # curly + straight apostrophe
  ):
    cleaned = candidate.strip()
    if cleaned and cleaned not in seen:
      seen.add(cleaned)
      variants.append(cleaned)
  return tuple(variants)


def geocode_queries(mention: PlaceMention) -> tuple[str, ...]:
  """Progressively simpler queries. Parent is NOT concatenated — used as viewbox."""
  queries: list[str] = []
  seen: set[str] = set()

  def add(*parts: str | None) -> None:
    query = ", ".join(part for part in parts if part)
    if query and query not in seen:
      seen.add(query)
      queries.append(query)

  for name in _name_query_variants(mention.place_name):
    add(name, mention.city, mention.state_province, mention.country)
    add(name, mention.state_province, mention.country)
    add(name, mention.country)
    add(name)
  return tuple(queries)


def _normalize_name(value: str) -> str:
  lowered = value.strip().lower()
  return re.sub(r"[^a-z0-9\s]+", " ", lowered)


def name_similarity(left: str, right: str) -> float:
  """Token-aware similarity in [0, 1]."""
  a = _normalize_name(left)
  b = _normalize_name(right)
  if not a or not b:
    return 0.0
  if a == b:
    return 1.0
  a_tokens = set(a.split())
  b_tokens = set(b.split())
  if a_tokens and b_tokens:
    jaccard = len(a_tokens & b_tokens) / len(a_tokens | b_tokens)
  else:
    jaccard = 0.0
  seq = SequenceMatcher(None, a, b).ratio()
  return max(jaccard, seq)


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  earth_radius_meters = 6_371_000
  phi1, phi2 = math.radians(lat1), math.radians(lat2)
  delta_phi = math.radians(lat2 - lat1)
  delta_lambda = math.radians(lon2 - lon1)
  a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
  return 2 * earth_radius_meters * math.asin(math.sqrt(a))


def _location_from_result(result: GeocodeResult) -> PlaceLocation:
  return PlaceLocation(
    display_name=result.display_name,
    continent=COUNTRY_CODE_TO_CONTINENT.get(result.country_code) if result.country_code else None,
    country=result.country,
    country_code=result.country_code,
    state_province=result.state_province,
    city=result.city,
    latitude=result.latitude,
    longitude=result.longitude,
    provider_place_id=result.provider_place_id,
    osm_class=result.osm_class,
    osm_type=result.osm_type,
  )


def _countries_match(mention_country: str | None, result: GeocodeResult) -> bool:
  """True when mention has no country hint, or it agrees with the result."""
  if not mention_country:
    return True
  if not result.country and not result.country_code:
    return True

  m = mention_country.strip().lower()
  r = (result.country or "").strip().lower()
  code = (result.country_code or "").strip().upper()

  groups = [
    {"usa", "us", "united states", "united states of america", "US"},
    {"uk", "united kingdom", "great britain", "gb", "GB"},
  ]
  for group in groups:
    lower = {g.lower() for g in group if len(g) > 2 or g.islower()}
    codes = {g for g in group if g.isupper()}
    if m in lower or m.upper() in codes:
      if code in codes or r in lower:
        return True

  if code and m.upper() == code:
    return True
  if m and r and (m in r or r in m):
    return True
  return False


def _is_visitable_result(result: GeocodeResult) -> bool:
  if result.category in _ADMIN_CATEGORIES:
    return False
  display = result.display_name.strip().lower()
  if result.state_province and display == result.state_province.strip().lower():
    return False
  if result.country and display == result.country.strip().lower():
    return False
  return True


def _region_agreement(mention: PlaceMention, result: GeocodeResult) -> float:
  score = 1.0
  if mention.country and (result.country or result.country_code):
    if not _countries_match(mention.country, result):
      return 0.0
  if mention.state_province and result.state_province:
    if mention.state_province.strip().lower() not in result.state_province.strip().lower() and (
      result.state_province.strip().lower() not in mention.state_province.strip().lower()
    ):
      score -= 0.25
  return max(0.0, score)


def _category_score(category: str | None) -> float:
  if category in _PREFERRED_CATEGORIES:
    return 1.0
  if category in _SETTLEMENT_CATEGORIES:
    # Town/city pins are fine when nothing more specific exists, but should
    # lose to attractions / natural features for the same name.
    return 0.4
  if category in _BAD_CATEGORIES:
    return 0.15
  if category in _ADMIN_CATEGORIES:
    return 0.0
  if category in _LOW_TRUST_CATEGORIES:
    return 0.2
  return 0.55


def _suffix_penalty(mention_name: str, result_name: str) -> float:
  """Penalize when result appends a type-changing token (Drive, Inn, …)."""
  mention_tokens = set(_normalize_name(mention_name).split())
  result_tokens = set(_normalize_name(result_name).split())
  if not mention_tokens or not result_tokens:
    return 0.0
  extra = result_tokens - mention_tokens
  if extra & _TYPE_CHANGING_SUFFIXES:
    return 0.35
  return 0.0


def _looks_like_parent_scale(mention: PlaceMention, result: GeocodeResult) -> bool:
  parent = mention.parent_place_name
  if not parent:
    return False
  parent_sim = name_similarity(parent, result.display_name)
  child_sim = name_similarity(mention.place_name, result.display_name)
  if parent_sim >= 0.75 and parent_sim > child_sim + 0.1:
    return True
  if result.category in _ADMIN_CATEGORIES and parent_sim >= 0.55:
    return True
  return False


def score_match(
  mention: PlaceMention,
  result: GeocodeResult,
  *,
  anchor_lat: float | None = None,
  anchor_lon: float | None = None,
) -> float:
  name_score = name_similarity(mention.place_name, result.display_name)
  cat_score = _category_score(result.category)
  region_score = _region_agreement(mention, result)
  base = (0.50 * name_score) + (0.30 * cat_score) + (0.20 * region_score)
  base -= _suffix_penalty(mention.place_name, result.display_name)

  if anchor_lat is not None and anchor_lon is not None:
    distance = haversine_meters(anchor_lat, anchor_lon, result.latitude, result.longitude)
    if distance <= NEAR_ANCHOR_METERS:
      base += 0.12 * (1.0 - distance / NEAR_ANCHOR_METERS)
    elif distance > FAR_FROM_PARENT_METERS:
      base -= 0.25

  return max(0.0, min(1.0, base))


def _dedupe_candidates(candidates: list[GeocodeResult]) -> list[GeocodeResult]:
  seen: set[str] = set()
  unique: list[GeocodeResult] = []
  for candidate in candidates:
    key = candidate.provider_place_id or f"{candidate.display_name}:{candidate.latitude}:{candidate.longitude}"
    if key in seen:
      continue
    seen.add(key)
    unique.append(candidate)
  return unique


def _parent_anchor(
  mention: PlaceMention,
  queries_tried: list[str],
  notes: list[str],
) -> tuple[float, float] | None:
  """Geocode the parent once to get a geographic anchor for the child search."""
  parent = mention.parent_place_name
  if not parent:
    return None
  parent_queries = [
    ", ".join(part for part in (parent, mention.state_province, mention.country) if part),
    ", ".join(part for part in (parent, mention.country) if part),
    parent,
  ]
  for query in parent_queries:
    if not query or query in queries_tried:
      continue
    queries_tried.append(f"parent:{query}")
    try:
      result = geocoder.geocode_normalized(query, fallback_name=parent)
    except Exception as exc:
      notes.append(f"parent geocode error for {query!r}: {exc}")
      continue
    if result is None:
      notes.append(f"no parent result for {query!r}")
      continue
    notes.append(
      f"parent anchor {result.display_name} @ {result.latitude:.4f},{result.longitude:.4f}"
    )
    return (result.latitude, result.longitude)
  return None


def _collect_forward_candidates(
  mention: PlaceMention,
  *,
  viewbox: Viewbox | None,
  queries_tried: list[str],
  notes: list[str],
) -> list[GeocodeResult]:
  candidates: list[GeocodeResult] = []

  def run_queries(*, box: Viewbox | None, bounded: bool, label: str) -> None:
    nonlocal candidates
    for query in geocode_queries(mention):
      tag = f"{query} [{label}]" if label else query
      if tag in queries_tried:
        continue
      queries_tried.append(tag)
      try:
        batch = geocoder.geocode_normalized_many(
          query,
          fallback_name=mention.place_name,
          limit=CANDIDATE_LIMIT,
          viewbox=box,
          bounded=bounded,
        )
      except Exception as exc:
        notes.append(f"geocode error for {tag!r}: {exc}")
        continue
      if not batch:
        notes.append(f"no result for {tag!r}")
        continue
      notes.append(f"{len(batch)} candidate(s) for {tag!r}")
      candidates.extend(batch)
      if len(_dedupe_candidates(candidates)) >= CANDIDATE_LIMIT * 2:
        return

  # Prefer results inside the parent/coords viewbox when we have one.
  if viewbox is not None:
    run_queries(box=viewbox, bounded=True, label="bounded")
    if not candidates:
      notes.append("bounded viewbox empty; retrying preferred (unbounded) viewbox")
      run_queries(box=viewbox, bounded=False, label="viewbox")
  if not candidates:
    run_queries(box=None, bounded=False, label="global")

  return candidates


def _rank_candidates(
  mention: PlaceMention,
  candidates: list[GeocodeResult],
  *,
  anchor_lat: float | None,
  anchor_lon: float | None,
  notes: list[str],
) -> list[tuple[float, GeocodeResult]]:
  scored: list[tuple[float, GeocodeResult]] = []
  for candidate in _dedupe_candidates(candidates):
    if not _is_visitable_result(candidate):
      notes.append(
        f"rejected non-visitable: {candidate.display_name} ({candidate.category})"
      )
      continue
    if mention.country and not _countries_match(mention.country, candidate):
      notes.append(
        f"rejected country mismatch: {candidate.display_name} ({candidate.country})"
      )
      continue
    if _looks_like_parent_scale(mention, candidate):
      notes.append(f"rejected parent-scale: {candidate.display_name}")
      continue
    confidence = score_match(
      mention,
      candidate,
      anchor_lat=anchor_lat,
      anchor_lon=anchor_lon,
    )
    scored.append((confidence, candidate))

  if not scored:
    return []

  # When we have a parent/coords anchor, only trust candidates near it.
  if anchor_lat is not None and anchor_lon is not None:
    near: list[tuple[float, GeocodeResult]] = []
    for confidence, candidate in scored:
      distance = haversine_meters(
        anchor_lat, anchor_lon, candidate.latitude, candidate.longitude
      )
      if distance <= FAR_FROM_PARENT_METERS:
        near.append((confidence, candidate))
      else:
        notes.append(
          f"far from anchor ({distance/1000:.0f}km): {candidate.display_name}"
        )
    if not near:
      notes.append("no candidates near anchor; refusing distant same-name hits")
      return []
    scored = near

  scored.sort(key=lambda item: item[0], reverse=True)
  return scored


def _should_ask_llm(scored: list[tuple[float, GeocodeResult]]) -> bool:
  """True when ranking is weak or top candidates are too close to call."""
  if not scored:
    return False
  best_score = scored[0][0]
  if best_score < HIGH_CONFIDENCE:
    return True
  if len(scored) >= 2 and (best_score - scored[1][0]) <= LLM_AMBIGUITY_MARGIN:
    return True
  return False


def _pick_best(
  mention: PlaceMention,
  candidates: list[GeocodeResult],
  *,
  anchor_lat: float | None,
  anchor_lon: float | None,
  notes: list[str],
) -> tuple[GeocodeResult, float] | None:
  scored = _rank_candidates(
    mention,
    candidates,
    anchor_lat=anchor_lat,
    anchor_lon=anchor_lon,
    notes=notes,
  )
  if not scored:
    return None

  for score, candidate in scored[:4]:
    notes.append(f"ranked: {candidate.display_name} ({candidate.category}) score={score:.2f}")

  if _should_ask_llm(scored):
    shortlist = scored[: min(8, len(scored))]
    shortlist_candidates = [candidate for _, candidate in shortlist]
    from travelplanner.places.llm_pick import pick_candidate_index

    chosen_index, note = pick_candidate_index(mention, shortlist_candidates)
    notes.append(note)
    if chosen_index is not None:
      chosen = shortlist_candidates[chosen_index]
      confidence = max(shortlist[chosen_index][0], HIGH_CONFIDENCE)
      notes.append(
        f"llm override → {chosen.display_name} ({chosen.category}) "
        f"score={confidence:.2f}"
      )
      return chosen, confidence
    if note.startswith("llm_pick rejected"):
      # Model said none of the candidates fit.
      return None
    # Missing key / API error — keep deterministic ranking.

  best_score, best = scored[0]
  notes.append(
    f"picked {best.display_name} ({best.category}) score={best_score:.2f} "
    f"from {len(scored)} scored candidate(s)"
  )
  return best, best_score


def _finalize(
  mention: PlaceMention,
  result: GeocodeResult,
  confidence: float,
  queries_tried: list[str],
  notes: list[str],
) -> LocateDebugResult:
  location = _location_from_result(result)
  if confidence >= HIGH_CONFIDENCE:
    status = "resolved"
  elif confidence >= LOW_CONFIDENCE:
    status = "low_confidence"
    notes = [*notes, f"match_confidence={confidence:.2f} below high threshold"]
  else:
    return LocateDebugResult(
      status="unresolved",
      location=location,
      match_confidence=confidence,
      category=result.category,
      provider=result.provider,
      queries_tried=tuple(queries_tried),
      notes=(*notes, f"match_confidence={confidence:.2f} rejected"),
    )
  return LocateDebugResult(
    status=status,
    location=location,
    match_confidence=confidence,
    category=result.category,
    provider=result.provider,
    queries_tried=tuple(queries_tried),
    notes=tuple(notes),
  )


def locate_mention_debug(mention: PlaceMention) -> LocateDebugResult:
  """Locate with multi-candidate ranking + parent viewbox. No persistence."""
  queries_tried: list[str] = []
  notes: list[str] = []
  candidates: list[GeocodeResult] = []

  parent_coords = _parent_anchor(mention, queries_tried, notes)
  viewbox: Viewbox | None = None
  anchor_lat: float | None = None
  anchor_lon: float | None = None

  if parent_coords is not None:
    anchor_lat, anchor_lon = parent_coords
    viewbox = geocoder.viewbox_around(
      anchor_lat,
      anchor_lon,
      half_span_degrees=PARENT_VIEWBOX_HALF_SPAN,
    )

  # Coords present: reverse + forward near the pin, then reconcile.
  if mention.latitude is not None and mention.longitude is not None:
    queries_tried.append(f"reverse:{mention.latitude},{mention.longitude}")
    try:
      reverse_hit = geocoder.reverse_geocode_normalized(
        mention.latitude,
        mention.longitude,
        fallback_name=mention.place_name,
      )
    except Exception as exc:
      notes.append(f"reverse_geocode error: {exc}")
      reverse_hit = None
    if reverse_hit is not None:
      candidates.append(reverse_hit)
      notes.append(f"reverse hit: {reverse_hit.display_name} ({reverse_hit.category})")

    # Prefer name matches near the IG coordinates.
    coord_viewbox = geocoder.viewbox_around(
      mention.latitude,
      mention.longitude,
      half_span_degrees=0.08,
    )
    forward = _collect_forward_candidates(
      mention,
      viewbox=coord_viewbox,
      queries_tried=queries_tried,
      notes=notes,
    )
    candidates.extend(forward)
    if anchor_lat is None:
      anchor_lat, anchor_lon = mention.latitude, mention.longitude
  else:
    candidates.extend(
      _collect_forward_candidates(
        mention,
        viewbox=viewbox,
        queries_tried=queries_tried,
        notes=notes,
      )
    )

  picked = _pick_best(
    mention,
    candidates,
    anchor_lat=anchor_lat,
    anchor_lon=anchor_lon,
    notes=notes,
  )
  if picked is None:
    outcome = LocateDebugResult(
      status="unresolved",
      queries_tried=tuple(queries_tried),
      notes=tuple(notes) if notes else ("no visitable geocode result",),
    )
  else:
    result, confidence = picked
    outcome = _finalize(mention, result, confidence, queries_tried, notes)

  display = outcome.location.display_name if outcome.location else None
  logger.info(
    "locate %s place_name=%r display=%r confidence=%s queries=%d candidates=%d",
    outcome.status,
    mention.place_name,
    display,
    f"{outcome.match_confidence:.2f}" if outcome.match_confidence is not None else None,
    len(outcome.queries_tried),
    len(candidates),
  )
  if outcome.notes:
    logger.debug("locate notes place_name=%r %s", mention.place_name, list(outcome.notes))
  if outcome.queries_tried:
    logger.debug(
      "locate queries place_name=%r %s",
      mention.place_name,
      list(outcome.queries_tried),
    )
  return outcome


def locate_mention(mention: PlaceMention) -> PlaceLocation | None:
  """Return a trusted pin only (resolved). Low-confidence is not auto-trusted."""
  debug = locate_mention_debug(mention)
  if debug.status == "resolved":
    return debug.location
  return None
