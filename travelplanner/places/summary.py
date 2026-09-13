"""Helpers for synthesizing intuitive place summaries and sanitizing place tips."""

from __future__ import annotations

import re
from collections.abc import Sequence
from typing import TYPE_CHECKING

from travelplanner.places.mention_details import compact_mention_details

if TYPE_CHECKING:
  from travelplanner.models import PlaceFacts, PlaceLocation

_TIP_PREFIX_RE = re.compile(
  r"^(?:💡|•|-|\*|tip:?|note:?|advice:?|pro-?tip:?)\s*",
  re.IGNORECASE,
)
_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> set[str]:
  return set(_WORD_RE.findall(text.lower()))


def _jaccard(a: set[str], b: set[str]) -> float:
  if not a or not b:
    return 0.0
  inter = len(a & b)
  union = len(a | b)
  return inter / union if union else 0.0


def sanitize_place_tips(
  tips: Sequence[str],
  *,
  place_name: str = "",
  near_dup_threshold: float = 0.65,
) -> tuple[str, ...]:
  """Clean, format, and deduplicate concrete tips from reels and enrichment."""
  cleaned_tips: list[str] = []
  seen_token_sets: list[set[str]] = []

  for raw in tips:
    if not raw:
      continue
    text = " ".join(str(raw).split()).strip()
    # Strip leading bullets or emojis
    text = _TIP_PREFIX_RE.sub("", text).strip()
    if not text or len(text) < 4:
      continue

    # Capitalize first letter
    text = text[0].upper() + text[1:]
    tokens = _tokenize(text)

    # Check for near-duplicates
    is_dup = False
    for existing_tokens in seen_token_sets:
      if _jaccard(tokens, existing_tokens) >= near_dup_threshold:
        is_dup = True
        break

    if not is_dup:
      cleaned_tips.append(text)
      seen_token_sets.append(tokens)

  return tuple(cleaned_tips)


def synthesize_place_summary(
  display_name: str,
  category: str | None,
  location: PlaceLocation,
  details: Sequence[str] = (),
  facts: PlaceFacts | None = None,
  existing_summary: str | None = None,
) -> str | None:
  """Synthesize an intuitive, traveler-friendly summary of the place.

  Combines creator-grounded details with source-backed facts (e.g. famous_for),
  ensuring no redundant phrasing and presenting an engaging 1-2 sentence overview.
  """
  famous = (facts.famous_for.strip() if facts and facts.famous_for else "") or None
  compact_details = compact_mention_details(details, place_name=display_name) if details else ()
  primary_detail = compact_details[0] if compact_details else None

  if famous and primary_detail:
    fam_tokens = _tokenize(famous)
    det_tokens = _tokenize(primary_detail)
    # If they are very similar, prefer the more informative one
    if _jaccard(fam_tokens, det_tokens) > 0.5:
      return famous if len(famous) >= len(primary_detail) else primary_detail
    # Otherwise combine into a cohesive summary
    fam_clean = famous.rstrip(".")
    det_clean = primary_detail.rstrip(".")
    return f"{fam_clean}. {det_clean}."

  if famous:
    return famous if famous.endswith((".", "!", "?")) else f"{famous}."

  if primary_detail:
    return primary_detail if primary_detail.endswith((".", "!", "?")) else f"{primary_detail}."

  if existing_summary:
    return existing_summary

  # Fallback: clean location context
  cat_label = (category or "destination").replace("_", " ")
  loc_parts = [p for p in (location.city, location.state_province, location.country) if p]
  loc_str = ", ".join(loc_parts) if loc_parts else "the area"
  return f"A notable {cat_label} in {loc_str}."
