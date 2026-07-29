"""Fact-tool adapters."""

from __future__ import annotations

from travelplanner.places.facts.tools.google import fetch_google_place_details
from travelplanner.places.facts.tools.nps import fetch_nps_park
from travelplanner.places.facts.tools.osm import fetch_osm_tags
from travelplanner.places.facts.tools.wikipedia import fetch_wikipedia_summary

__all__ = [
  "fetch_google_place_details",
  "fetch_nps_park",
  "fetch_osm_tags",
  "fetch_wikipedia_summary",
]
