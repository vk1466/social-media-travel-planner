"""Google Maps place details via Mindcase. Gated by MINDCASE_API_KEY."""

from __future__ import annotations

from typing import Any

from travelplanner.clients import mindcase
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso

TOOL_ID = "google_place_details"
SOURCE_NAME = "google_places"

def _is_google_place_id(provider_place_id: str | None) -> bool:
  if not provider_place_id:
    return False
  token = provider_place_id.strip()
  if token.startswith("overpass:") or token.isdigit():
    return False
  return token.startswith("ChIJ") or token.startswith("GhIJ")


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


def _float_or_none(value: Any) -> float | None:
  try:
    if value is None or value == "":
      return None
    return float(value)
  except (TypeError, ValueError):
    return None


def _location_label(query: FactQuery) -> str:
  parts = [
    part
    for part in (query.city, query.state_province, query.country)
    if part and str(part).strip()
  ]
  if parts:
    return ", ".join(parts)
  return f"{query.latitude},{query.longitude}"


def _opening_hours_lines(raw: Any) -> list[str]:
  if isinstance(raw, str) and raw.strip():
    return [raw.strip()]
  if not isinstance(raw, list):
    return []
  lines: list[str] = []
  for item in raw:
    if isinstance(item, str) and item.strip():
      lines.append(item.strip())
      continue
    if not isinstance(item, dict):
      continue
    day = _optional_str(item.get("day") or item.get("name"))
    hours = _optional_str(item.get("hours") or item.get("time") or item.get("value"))
    if day and hours:
      lines.append(f"{day}: {hours}")
    elif hours:
      lines.append(hours)
  return lines


def _price_level(raw: Any) -> int | None:
  if isinstance(raw, int) and not isinstance(raw, bool) and 0 <= raw <= 4:
    return raw
  text = _optional_str(raw)
  if not text:
    return None
  dollars = text.count("$")
  if dollars:
    return min(4, dollars)
  return None


def _reservation_required(info: Any) -> bool | None:
  if not isinstance(info, dict):
    return None
  blob = str(info).casefold()
  if "reservations required" in blob or "reservation required" in blob:
    return True
  if "accepts reservations" in blob or "takes reservations" in blob:
    return True
  if "reservations not accepted" in blob or "no reservations" in blob:
    return False
  return None


def _cuisines(category: str | None, all_categories: Any) -> list[str]:
  labels: list[str] = []
  if isinstance(all_categories, list):
    labels.extend(str(item).strip() for item in all_categories if str(item).strip())
  elif isinstance(all_categories, str) and all_categories.strip():
    labels.extend(part.strip() for part in all_categories.split(",") if part.strip())
  if category:
    labels.append(category.strip())
  seen: set[str] = set()
  cuisines: list[str] = []
  for label in labels:
    key = label.casefold()
    if key in seen:
      continue
    seen.add(key)
    if any(hint in key for hint in _FOOD_HINTS):
      cleaned = label.replace(" restaurant", "").replace(" Restaurant", "").strip()
      if cleaned:
        cuisines.append(cleaned)
  return cuisines


def _website_url(raw: Any) -> str | None:
  url = _optional_str(raw)
  if not url:
    return None
  if url.startswith("http://") or url.startswith("https://"):
    return url
  return f"https://{url}"


def _normalize_row(row: dict[str, Any]) -> dict[str, Any]:
  hours = _opening_hours_lines(row.get("openingHours") or row.get("opening_hours"))
  website = _website_url(row.get("website") or row.get("websiteUrl"))
  phone = _optional_str(row.get("phone") or row.get("phoneNumber"))
  description = _optional_str(row.get("description") or row.get("about"))
  category = _optional_str(row.get("category") or row.get("categoryName"))
  cuisines = _cuisines(category, row.get("allCategories") or row.get("categories"))
  price_level = _price_level(row.get("priceRange") or row.get("price"))
  reservation_required = _reservation_required(row.get("additionalInfo") or row.get("additional_info"))
  content = dict(row)
  if website:
    content["website_url"] = website
  if phone:
    content["phone_number"] = phone
  if hours:
    content["opening_hours_text"] = hours
  if description:
    content["famous_for"] = description
  if cuisines:
    content["cuisines"] = cuisines
  if price_level is not None:
    content["price_level"] = price_level
  if reservation_required is not None:
    content["reservation_required"] = reservation_required
  return content


def _row_to_document(row: dict[str, Any], retrieved_at: str) -> SourceDocument:
  content = _normalize_row(row)
  place_id = _optional_str(row.get("placeId") or row.get("place_id"))
  place_url = _optional_str(row.get("placeUrl") or row.get("url") or row.get("place_url"))
  source_ref = place_id or place_url or _optional_str(row.get("businessName")) or "google_maps"
  title = (
    _optional_str(row.get("businessName") or row.get("title") or row.get("name"))
    or source_ref
  )
  return SourceDocument(
    tool_id=TOOL_ID,
    source_name=SOURCE_NAME,
    source_ref=source_ref,
    title=title,
    latitude=_float_or_none(row.get("latitude") or row.get("lat")),
    longitude=_float_or_none(row.get("longitude") or row.get("lng") or row.get("lon")),
    content=content,
    retrieved_at=retrieved_at,
  )


def draft_facts_from_google_documents(documents: list[SourceDocument]) -> dict[str, Any] | None:
  """Back-compat wrapper around the shared structured mapper."""
  from travelplanner.places.facts.pipeline.structured import draft_facts_from_documents

  return draft_facts_from_documents(documents)


def fetch_google_place_details(query: FactQuery) -> list[SourceDocument]:
  """Look up this pin on Google Maps via Mindcase. Empty list when nothing returns."""
  place_urls: list[str] | None = None
  keywords: list[str] | None = None
  location: str | None = None
  if _is_google_place_id(query.provider_place_id):
    place_urls = [query.provider_place_id.strip()]
  else:
    keywords = [query.display_name, *query.aliases[:2]]
    location = _location_label(query)
  rows = mindcase.fetch_google_maps_places(
    keywords=keywords,
    location=location,
    place_urls=place_urls,
    max_results=3 if not place_urls else 1,
  )
  retrieved_at = utc_now_iso()
  return [_row_to_document(row, retrieved_at) for row in rows if isinstance(row, dict)]
