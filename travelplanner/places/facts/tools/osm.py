"""OSM / Overpass adapter for place facts."""

from __future__ import annotations

from travelplanner.clients import overpass
from travelplanner.places.facts.pipeline.match import match_radius_m
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso

TOOL_ID = "osm_tags"
SOURCE_NAME = "osm"


def fetch_osm_tags(query: FactQuery) -> list[SourceDocument]:
  radius = match_radius_m(query.category)
  elements = overpass.fetch_nearby_tagged_elements(
    query.latitude,
    query.longitude,
    radius_m=radius,
    limit=12,
  )
  retrieved_at = utc_now_iso()
  documents: list[SourceDocument] = []
  for element in elements:
    content = element.get("content") or {}
    if not isinstance(content, dict):
      continue
    website = content.get("website") or content.get("contact:website")
    phone = content.get("phone") or content.get("contact:phone")
    fee = content.get("fee") or content.get("charge")
    normalized = dict(content)
    if website:
      normalized["website"] = website
    if phone:
      normalized["phone"] = phone
    if fee:
      normalized["fee"] = fee
    documents.append(
      SourceDocument(
        tool_id=TOOL_ID,
        source_name=SOURCE_NAME,
        source_ref=str(element["source_ref"]),
        title=str(element.get("title") or query.display_name),
        latitude=element.get("latitude"),
        longitude=element.get("longitude"),
        content=normalized,
        retrieved_at=retrieved_at,
      )
    )
  return documents
