"""Wikipedia summary adapter for place facts."""

from __future__ import annotations

from travelplanner.clients import wikipedia
from travelplanner.places.facts.match import match_radius_m
from travelplanner.places.facts.types import FactQuery, SourceDocument, utc_now_iso

TOOL_ID = "wikipedia_summary"
SOURCE_NAME = "wikipedia"


def fetch_wikipedia_summary(query: FactQuery) -> list[SourceDocument]:
  radius = min(match_radius_m(query.category), 10_000)
  titles: list[str] = []
  seen: set[str] = set()

  for title in wikipedia.geosearch(
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
  if query.country:
    search_query = f"{query.display_name} {query.country}"
  for title in wikipedia.search_titles(search_query, limit=5):
    key = title.casefold()
    if key not in seen:
      seen.add(key)
      titles.append(title)

  retrieved_at = utc_now_iso()
  documents: list[SourceDocument] = []
  for title in titles[:8]:
    summary = wikipedia.fetch_summary(title)
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
