"""Unit tests for Wikivoyage client and place-facts tool."""

from __future__ import annotations

from unittest.mock import patch

from travelplanner.clients import wikivoyage
from travelplanner.places.facts.tools.catalog import select_tools
from travelplanner.places.facts.tools.wikivoyage import TOOL_ID, fetch_wikivoyage_summary
from travelplanner.places.facts.types import FactQuery


def test_wikivoyage_in_catalog() -> None:
  tools = select_tools("park")
  tool_ids = [t.tool_id for t in tools]
  assert TOOL_ID in tool_ids

  tools_city = select_tools("city")
  tool_ids_city = [t.tool_id for t in tools_city]
  assert TOOL_ID in tool_ids_city


@patch("travelplanner.clients.wikivoyage._get_json")
def test_fetch_summary(mock_get_json) -> None:
  mock_get_json.return_value = {
    "title": "Crater Lake National Park",
    "extract": "Crater Lake National Park is a national park located in southern Oregon.",
    "content_urls": {
      "desktop": {"page": "https://en.wikivoyage.org/wiki/Crater_Lake_National_Park"}
    },
    "coordinates": {"lat": 42.9446, "lon": -122.1090},
    "description": "national park in Oregon, United States",
  }
  summary = wikivoyage.fetch_summary("Crater Lake National Park")
  assert summary is not None
  assert summary.title == "Crater Lake National Park"
  assert "southern Oregon" in summary.extract
  assert summary.latitude == 42.9446
  assert summary.longitude == -122.1090
  assert summary.url == "https://en.wikivoyage.org/wiki/Crater_Lake_National_Park"


@patch("travelplanner.clients.wikivoyage._get_json")
def test_geosearch_and_search_titles(mock_get_json) -> None:
  mock_get_json.side_effect = [
    {
      "query": {
        "geosearch": [
          {"title": "Crater Lake"},
          {"title": "Klamath Falls"},
        ]
      }
    },
    {
      "query": {
        "search": [
          {"title": "Crater Lake National Park"},
        ]
      }
    },
  ]
  geo_titles = wikivoyage.geosearch(42.9446, -122.1090)
  assert geo_titles == ["Crater Lake", "Klamath Falls"]

  search_titles = wikivoyage.search_titles("Crater Lake")
  assert search_titles == ["Crater Lake National Park"]


@patch("travelplanner.clients.wikivoyage.fetch_summary")
@patch("travelplanner.clients.wikivoyage.search_titles")
@patch("travelplanner.clients.wikivoyage.geosearch")
def test_fetch_wikivoyage_summary(mock_geosearch, mock_search_titles, mock_fetch_summary) -> None:
  mock_geosearch.return_value = ["Crater Lake National Park"]
  mock_search_titles.return_value = ["Crater Lake National Park"]
  mock_fetch_summary.return_value = wikivoyage.WikivoyageSummary(
    title="Crater Lake National Park",
    extract="Known for its deep blue water and sheer cliffs.",
    url="https://en.wikivoyage.org/wiki/Crater_Lake_National_Park",
    latitude=42.9446,
    longitude=-122.1090,
    description="park in Oregon",
  )

  query = FactQuery(
    place_id="us-oregon-crater-lake",
    display_name="Crater Lake",
    category="park",
    latitude=42.9446,
    longitude=-122.1090,
    country="United States",
  )

  docs = fetch_wikivoyage_summary(query)
  assert len(docs) == 1
  assert docs[0].tool_id == "wikivoyage_summary"
  assert docs[0].source_name == "wikivoyage"
  assert docs[0].title == "Crater Lake National Park"
  assert docs[0].content["text"] == "Known for its deep blue water and sheer cliffs."
  assert docs[0].content["description"] == "park in Oregon"
