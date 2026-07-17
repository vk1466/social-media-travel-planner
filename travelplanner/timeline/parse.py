"""Parse Google Maps Timeline exports (phone + Takeout) into visit candidates."""

from __future__ import annotations

import io
import json
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

TimelineFormat = Literal["phone", "takeout_semantic", "records", "mixed", "unknown"]

# Degree-string coords from phone exports: "50.0506312°, 14.3439906°"
_LAT_LNG_RE = re.compile(
  r"^\s*(-?\d+(?:\.\d+)?)\s*°?\s*,\s*(-?\d+(?:\.\d+)?)\s*°?\s*$"
)

_SKIP_SEMANTIC_TYPES = frozenset(
  {
    "TYPE_HOME",
    "TYPE_WORK",
    "HOME",
    "WORK",
  }
)


@dataclass(frozen=True)
class TimelineVisit:
  """Normalized place-visit from any Timeline export format."""

  latitude: float
  longitude: float
  visited_from: str | None = None  # YYYY-MM-DD
  visited_to: str | None = None
  place_name: str | None = None
  google_place_id: str | None = None
  semantic_type: str | None = None
  address: str | None = None
  source_format: TimelineFormat = "unknown"


def detect_format(payload: Any) -> TimelineFormat:
  """Detect Timeline JSON shape from top-level structure."""
  if isinstance(payload, list):
    if payload and isinstance(payload[0], dict):
      first = payload[0]
      if "visit" in first or "timelinePath" in first or "activity" in first:
        return "phone"
      if "placeVisit" in first or "activitySegment" in first:
        return "takeout_semantic"
    return "unknown"

  if not isinstance(payload, dict):
    return "unknown"

  if "semanticSegments" in payload or "rawSignals" in payload:
    return "phone"
  if "timelineObjects" in payload:
    return "takeout_semantic"
  if "locations" in payload:
    return "records"
  return "unknown"


def _parse_degree_lat_lng(value: str | None) -> tuple[float, float] | None:
  if not value or not isinstance(value, str):
    return None
  match = _LAT_LNG_RE.match(value.replace("\u00b0", "°"))
  if not match:
    return None
  return float(match.group(1)), float(match.group(2))


def _coords_from_e7(
  latitude_e7: Any = None,
  longitude_e7: Any = None,
  *,
  lat_key: Any = None,
  lng_key: Any = None,
) -> tuple[float, float] | None:
  lat_raw = latitude_e7 if latitude_e7 is not None else lat_key
  lng_raw = longitude_e7 if longitude_e7 is not None else lng_key
  if lat_raw is None or lng_raw is None:
    return None
  try:
    return float(lat_raw) / 1e7, float(lng_raw) / 1e7
  except (TypeError, ValueError):
    return None


def _coords_from_location(location: dict[str, Any] | None) -> tuple[float, float] | None:
  if not isinstance(location, dict):
    return None
  coords = _coords_from_e7(location.get("latitudeE7"), location.get("longitudeE7"))
  if coords is not None:
    return coords
  lat_lng = location.get("latLng") or location.get("LatLng")
  if isinstance(lat_lng, str):
    return _parse_degree_lat_lng(lat_lng)
  return None


def _date_from_timestamp(value: Any) -> str | None:
  """Normalize Google timestamps to YYYY-MM-DD (UTC calendar day)."""
  if value is None:
    return None
  if isinstance(value, (int, float)):
    ms = int(value)
    if ms < 1_000_000_000_000:
      ms *= 1000
    try:
      return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
    except (OverflowError, OSError, ValueError):
      return None
  text = str(value).strip()
  if not text:
    return None
  if text.isdigit():
    return _date_from_timestamp(int(text))
  try:
    normalized = text.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is not None:
      dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%d")
  except ValueError:
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
      return text[:10]
    return None


def _duration_dates(duration: dict[str, Any] | None) -> tuple[str | None, str | None]:
  if not isinstance(duration, dict):
    return None, None
  start = duration.get("startTimestamp") or duration.get("startTimestampMs")
  end = duration.get("endTimestamp") or duration.get("endTimestampMs")
  return _date_from_timestamp(start), _date_from_timestamp(end)


def _should_skip_semantic(semantic_type: str | None) -> bool:
  if not semantic_type:
    return False
  return semantic_type.strip().upper() in _SKIP_SEMANTIC_TYPES


def _parse_phone_payload(payload: dict[str, Any] | list[Any]) -> list[TimelineVisit]:
  segments: list[Any]
  if isinstance(payload, list):
    segments = payload
  else:
    segments = payload.get("semanticSegments") or []
  if not isinstance(segments, list):
    return []

  visits: list[TimelineVisit] = []
  for segment in segments:
    if not isinstance(segment, dict):
      continue
    visit = segment.get("visit")
    if not isinstance(visit, dict):
      continue
    candidate = visit.get("topCandidate")
    if not isinstance(candidate, dict):
      continue
    semantic_type = candidate.get("semanticType")
    if isinstance(semantic_type, str) and _should_skip_semantic(semantic_type):
      continue
    place_location = candidate.get("placeLocation")
    coords = None
    if isinstance(place_location, dict):
      coords = _coords_from_location(place_location)
    elif isinstance(place_location, str):
      coords = _parse_degree_lat_lng(place_location)
    if coords is None:
      continue
    start = _date_from_timestamp(segment.get("startTime"))
    end = _date_from_timestamp(segment.get("endTime"))
    place_id = candidate.get("placeId")
    visits.append(
      TimelineVisit(
        latitude=coords[0],
        longitude=coords[1],
        visited_from=start,
        visited_to=end,
        place_name=None,
        google_place_id=str(place_id) if place_id else None,
        semantic_type=str(semantic_type) if semantic_type else None,
        source_format="phone",
      )
    )
  return visits


def _parse_takeout_semantic(payload: dict[str, Any] | list[Any]) -> list[TimelineVisit]:
  objects: list[Any]
  if isinstance(payload, list):
    objects = payload
  else:
    objects = payload.get("timelineObjects") or []
  if not isinstance(objects, list):
    return []

  visits: list[TimelineVisit] = []
  for item in objects:
    if not isinstance(item, dict):
      continue
    place_visit = item.get("placeVisit")
    if not isinstance(place_visit, dict):
      continue
    location = place_visit.get("location")
    if not isinstance(location, dict):
      # Fall back to other candidates when primary location is incomplete.
      candidates = place_visit.get("otherCandidateLocations")
      location = candidates[0] if isinstance(candidates, list) and candidates else None
    if not isinstance(location, dict):
      continue
    semantic_type = location.get("semanticType")
    if isinstance(semantic_type, str) and _should_skip_semantic(semantic_type):
      continue
    coords = _coords_from_location(location)
    if coords is None:
      candidates = place_visit.get("otherCandidateLocations")
      if isinstance(candidates, list):
        for alt in candidates:
          if isinstance(alt, dict):
            coords = _coords_from_location(alt)
            if coords is not None:
              location = alt
              semantic_type = alt.get("semanticType") or semantic_type
              break
    if coords is None:
      continue
    if isinstance(semantic_type, str) and _should_skip_semantic(semantic_type):
      continue
    start, end = _duration_dates(place_visit.get("duration"))
    name = location.get("name")
    address = location.get("address")
    place_id = location.get("placeId")
    visits.append(
      TimelineVisit(
        latitude=coords[0],
        longitude=coords[1],
        visited_from=start,
        visited_to=end,
        place_name=str(name).strip() if name else None,
        google_place_id=str(place_id) if place_id else None,
        semantic_type=str(semantic_type) if semantic_type else None,
        address=str(address).strip() if address else None,
        source_format="takeout_semantic",
      )
    )
  return visits


def parse_timeline_payload(payload: Any) -> tuple[TimelineFormat, list[TimelineVisit]]:
  """Parse one JSON document into visits. Records.json yields no visits."""
  fmt = detect_format(payload)
  if fmt == "phone":
    return fmt, _parse_phone_payload(payload)
  if fmt == "takeout_semantic":
    return fmt, _parse_takeout_semantic(payload)
  if fmt == "records":
    # Raw GPS pings are not place visits — skip intentionally.
    return fmt, []
  return fmt, []


def _load_json_bytes(data: bytes) -> Any:
  text = data.decode("utf-8-sig")
  return json.loads(text)


def parse_timeline_bytes(data: bytes, *, filename: str | None = None) -> tuple[TimelineFormat, list[TimelineVisit]]:
  """Parse a Timeline JSON file or ZIP archive (Takeout)."""
  name = (filename or "").lower()
  if name.endswith(".zip") or data[:2] == b"PK":
    return _parse_zip(data)

  payload = _load_json_bytes(data)
  return parse_timeline_payload(payload)


def _parse_zip(data: bytes) -> tuple[TimelineFormat, list[TimelineVisit]]:
  formats: set[TimelineFormat] = set()
  visits: list[TimelineVisit] = []
  with zipfile.ZipFile(io.BytesIO(data)) as archive:
    for info in archive.infolist():
      if info.is_dir():
        continue
      lower = info.filename.lower()
      if not lower.endswith(".json"):
        continue
      # Skip huge raw Records when Semantic History is present — still try parse.
      try:
        raw = archive.read(info)
        payload = _load_json_bytes(raw)
      except (UnicodeDecodeError, json.JSONDecodeError, KeyError):
        continue
      fmt, found = parse_timeline_payload(payload)
      formats.add(fmt)
      visits.extend(found)

  if not formats:
    return "unknown", []
  if len(formats) == 1:
    return next(iter(formats)), visits
  # Prefer reporting mixed when phone + takeout both present.
  meaningful = {fmt for fmt in formats if fmt not in {"unknown", "records"}}
  if len(meaningful) > 1:
    return "mixed", visits
  if meaningful:
    return next(iter(meaningful)), visits
  if "records" in formats:
    return "records", visits
  return "unknown", visits
