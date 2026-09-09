"""Wikivoyage travel guide adapter for place facts and recommendations."""

from __future__ import annotations

from travelplanner.clients import wikivoyage
from travelplanner.places.facts.pipeline.match import match_radius_m
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso

TOOL_ID = "wikivoyage_summary"
SOURCE_NAME = "wikivoyage"


def fetch_wikivoyage_summary(query: FactQuery) -> list[SourceDocument]:
  radius = min(match_radius_m(query.category), 20_000)
  titles: list[str] = []
  seen: set[str] = set()

  for title in wikivoyage.geosearch(
    query.latitude,
    query.longitude,
    radius_m=radius,
    limit=5,
  ):
    key = title.casefold()
    if key not in seen:
      seen.add(key)
      titles.append(title)

  search_query = query.display_name
  if query.city:
    search_query = f"{query.display_name} {query.city}"
  elif query.country:
    search_query = f"{query.display_name} {query.country}"
  for title in wikivoyage.search_titles(search_query, limit=5):
    key = title.casefold()
    if key not in seen:
      seen.add(key)
      titles.append(title)

  retrieved_at = utc_now_iso()
  documents: list[SourceDocument] = []
  for title in titles[:6]:
    summary = wikivoyage.fetch_summary(title)
    if summary is None:
      continue
    content: dict = {"text": summary.extract}
    if summary.description:
      content["description"] = summary.description
    documents.append(
      SourceDocument(
        tool_id=TOOL_ID,
        source_name=SOURCE_NAME,
        source_ref=summary.url,
        title=summary.title,
        latitude=summary.latitude,
        longitude=summary.longitude,
        content=content,
        retrieved_at=retrieved_at,
      )
    )
  return documents
