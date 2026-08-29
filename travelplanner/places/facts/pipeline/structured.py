"""Code mappers from matched source documents onto PlaceFacts fields."""

from __future__ import annotations

from typing import Any

from travelplanner.places.facts.types import SourceDocument

_FOOD_HINTS = frozenset(
  {
    "restaurant",
    "cafe",
    "coffee",
    "bar",
    "bakery",
    "pizza",
    "sushi",
    "diner",
    "bistro",
    "grill",
    "tavern",
    "pub",
  }
)


def _optional_str(value: Any) -> str | None:
  if value is None:
    return None
  text = str(value).strip()
  return text or None


def _website_url(raw: Any) -> str | None:
  url = _optional_str(raw)
  if not url:
    return None
  if url.startswith("http://") or url.startswith("https://"):
    return url
  return f"https://{url}"


def _float_or_none(value: Any) -> float | None:
  try:
    if value is None or value == "":
      return None
    return float(value)
  except (TypeError, ValueError):
    return None


def _cite(
  draft: dict[str, Any],
  evidence: list[dict[str, Any]],
  *,
  field_name: str,
  value: Any,
  document: SourceDocument,
) -> None:
  if value is None or value == "" or value == ():
    return
  if isinstance(value, list) and not value:
    return
  evidence.append(
    {
      "field_name": field_name,
      "source_name": document.source_name,
      "source_ref": document.source_ref,
      "value": value,
    }
  )
  if field_name not in draft:
    draft[field_name] = value


def _map_google(document: SourceDocument, draft: dict[str, Any], evidence: list[dict[str, Any]]) -> None:
  content = document.content
  _cite(draft, evidence, field_name="website_url", value=content.get("website_url"), document=document)
  _cite(draft, evidence, field_name="phone_number", value=content.get("phone_number"), document=document)
  hours = content.get("opening_hours_text")
  if isinstance(hours, list) and hours:
    _cite(draft, evidence, field_name="opening_hours_text", value=list(hours), document=document)
  _cite(draft, evidence, field_name="famous_for", value=content.get("famous_for"), document=document)
  cuisines = content.get("cuisines")
  if isinstance(cuisines, list) and cuisines:
    _cite(draft, evidence, field_name="cuisines", value=list(cuisines), document=document)
  if content.get("price_level") is not None:
    _cite(draft, evidence, field_name="price_level", value=content.get("price_level"), document=document)
  if content.get("reservation_required") is not None:
    _cite(
      draft,
      evidence,
      field_name="reservation_required",
      value=content.get("reservation_required"),
      document=document,
    )


def _osm_cuisines(raw: Any) -> list[str]:
  if isinstance(raw, list):
    labels = [str(item).strip() for item in raw if str(item).strip()]
  elif isinstance(raw, str) and raw.strip():
    labels = [part.strip() for part in raw.replace(",", ";").split(";") if part.strip()]
  else:
    labels = []
  seen: set[str] = set()
  out: list[str] = []
  for label in labels:
    key = label.casefold()
    if key in seen:
      continue
    seen.add(key)
    if any(hint in key for hint in _FOOD_HINTS) or ";" not in label:
      out.append(label)
  return out


def _osm_admission(raw: Any) -> str | None:
  text = _optional_str(raw)
  if not text:
    return None
  lowered = text.casefold()
  if lowered in {"no", "none", "free"}:
    return "Free"
  if lowered in {"yes", "true"}:
    return "Fee charged"
  return text


def _osm_hours(raw: Any) -> list[str]:
  if isinstance(raw, list):
    return [str(item).strip() for item in raw if str(item).strip()]
  text = _optional_str(raw)
  return [text] if text else []


def _osm_difficulty(raw: Any) -> str | None:
  text = _optional_str(raw)
  if not text:
    return None
  lowered = text.casefold()
  if lowered in {"easy", "hiking", "t1"}:
    return "easy"
  if lowered in {"moderate", "t2", "t3"}:
    return "moderate"
  if lowered in {"hard", "difficult", "t4", "t5", "t6"}:
    return "hard"
  return None


def _map_osm(document: SourceDocument, draft: dict[str, Any], evidence: list[dict[str, Any]]) -> None:
  content = document.content
  _cite(
    draft,
    evidence,
    field_name="website_url",
    value=_website_url(content.get("website") or content.get("contact:website")),
    document=document,
  )
  _cite(
    draft,
    evidence,
    field_name="phone_number",
    value=_optional_str(content.get("phone") or content.get("contact:phone")),
    document=document,
  )
  hours = _osm_hours(content.get("opening_hours"))
  if hours:
    _cite(draft, evidence, field_name="opening_hours_text", value=hours, document=document)
  _cite(
    draft,
    evidence,
    field_name="admission_text",
    value=_osm_admission(content.get("fee") or content.get("charge")),
    document=document,
  )
  cuisines = _osm_cuisines(content.get("cuisine"))
  if cuisines:
    _cite(draft, evidence, field_name="cuisines", value=cuisines, document=document)
  _cite(
    draft,
    evidence,
    field_name="famous_for",
    value=_optional_str(content.get("description")),
    document=document,
  )
  difficulty = _osm_difficulty(content.get("sac_scale") or content.get("trail_difficulty"))
  if difficulty:
    _cite(draft, evidence, field_name="difficulty", value=difficulty, document=document)
  distance_km = _float_or_none(content.get("distance_km") or content.get("length"))
  if distance_km is not None:
    _cite(draft, evidence, field_name="distance_km", value=distance_km, document=document)
  elevation = content.get("elevation_gain_m") or content.get("ele")
  try:
    if elevation is not None and str(elevation).strip() != "":
      gain = int(float(elevation))
      _cite(draft, evidence, field_name="elevation_gain_m", value=gain, document=document)
  except (TypeError, ValueError):
    pass


def _map_wikipedia(document: SourceDocument, draft: dict[str, Any], evidence: list[dict[str, Any]]) -> None:
  content = document.content
  text = _optional_str(content.get("description") or content.get("text"))
  if not text:
    return
  if len(text) > 400:
    text = text[:397].rstrip() + "..."
  _cite(draft, evidence, field_name="famous_for", value=text, document=document)


_MAPPERS = {
  "google_places": _map_google,
  "osm": _map_osm,
  "wikipedia": _map_wikipedia,
}


def draft_facts_from_documents(documents: list[SourceDocument]) -> dict[str, Any] | None:
  """Map structured source fields. Verify still picks winners by source priority."""
  draft: dict[str, Any] = {"notes": ["structured fill from source documents"]}
  evidence: list[dict[str, Any]] = []
  for document in documents:
    mapper = _MAPPERS.get(document.source_name)
    if mapper is None:
      continue
    mapper(document, draft, evidence)
  if not evidence:
    return None
  draft["evidence"] = evidence
  return draft
