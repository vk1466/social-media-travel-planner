"""Collapse per-reel `details` into distinctive visit reasons.

Each saved post contributes one extract sentence. Famous landmarks then
accumulate paraphrases of "iconic must-see" instead of useful Why-go copy.
"""

from __future__ import annotations

import re
from collections.abc import Sequence

_MAX_DETAILS = 3
_NEAR_DUP_JACCARD = 0.55
_MIN_DISTINCTIVE = 2

_WORD_RE = re.compile(r"[a-z0-9]+")
_VIDEO_META_RE = re.compile(
  r"\b(shown in|several shots?|in (?:the )?(?:reel|video|clip|footage)|"
  r"filmed|captured on camera)\b",
  re.IGNORECASE,
)

_HYPE = frozenset(
  {
    "amazing",
    "beautiful",
    "breathtaking",
    "bucket",
    "famous",
    "iconic",
    "incredible",
    "landmark",
    "list",
    "must",
    "mustsee",
    "mustvisit",
    "see",
    "stunning",
    "symbol",
    "unmissable",
    "visit",
    "visiting",
    "worldfamous",
  }
)

_FILLER = frozenset(
  {
    "a",
    "an",
    "and",
    "at",
    "attraction",
    "both",
    "city",
    "destination",
    "during",
    "especially",
    "for",
    "from",
    "in",
    "is",
    "it",
    "its",
    "iron",
    "lady",
    "lattice",
    "monument",
    "of",
    "offering",
    "offers",
    "place",
    "shown",
    "shots",
    "spot",
    "the",
    "this",
    "that",
    "to",
    "tower",
    "view",
    "views",
    "with",
  }
)


def compact_mention_details(
  details: Sequence[str],
  *,
  place_name: str = "",
) -> tuple[str, ...]:
  """Drop brochure/video blurbs and near-duplicates; keep a few specific claims."""
  scored: list[tuple[int, int, str]] = []
  for index, raw in enumerate(details):
    text = " ".join(str(raw).split())
    if not text:
      continue
    score = _specificity(text, place_name)
    if score < _MIN_DISTINCTIVE:
      continue
    scored.append((score, index, text))

  scored.sort(key=lambda item: (-item[0], item[1]))
  kept: list[str] = []
  for _, _, text in scored:
    if any(_too_similar(text, existing, place_name) for existing in kept):
      continue
    kept.append(text)
    if len(kept) >= _MAX_DETAILS:
      break
  return tuple(kept)


def _specificity(text: str, place_name: str) -> int:
  if _VIDEO_META_RE.search(text):
    return 0
  distinctive = _distinctive_tokens(text, place_name)
  if not distinctive:
    return 0
  return len(distinctive)


def _too_similar(left: str, right: str, place_name: str) -> bool:
  a = _distinctive_tokens(left, place_name)
  b = _distinctive_tokens(right, place_name)
  if not a or not b:
    return False
  overlap = len(a & b)
  union = len(a | b)
  return (overlap / union) >= _NEAR_DUP_JACCARD


def _distinctive_tokens(text: str, place_name: str) -> set[str]:
  tokens = _tokens(text) - _tokens(place_name) - _FILLER - _HYPE
  return tokens


def _tokens(text: str) -> set[str]:
  return set(_WORD_RE.findall(text.casefold().replace("must-see", "mustsee").replace("must-visit", "mustvisit")))
