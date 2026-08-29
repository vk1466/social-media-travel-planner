"""Type-specific place facts: tools → match → structured fill → insights → store.

Layout:
  config/    declarative fields, categories, rules, source trust
  pipeline/  match, LLM fill, verify
  tools/     fetchers + catalog
  enrich.py  orchestration / public entry
  types.py   shared envelopes
"""

from __future__ import annotations

from travelplanner.places.facts.enrich import EnrichResult, enrich_place_facts, facts_are_stale

__all__ = [
  "EnrichResult",
  "enrich_place_facts",
  "facts_are_stale",
]
