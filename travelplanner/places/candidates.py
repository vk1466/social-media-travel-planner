"""Persist unresolved / low-confidence place lookups for retry without re-fetch."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timezone

from travelplanner.db import place_candidates_repo
from travelplanner.models import PlaceCandidate, SavedPost
from travelplanner.place_hints import PlaceMention
from travelplanner.places.resolve import upsert_place
from travelplanner.places.store import slugify
from travelplanner.store import load_post_by_id, save_post


def _now_iso() -> str:
  return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_candidate_id(source_post_id: str, place_name: str) -> str:
  return f"{slugify(source_post_id)}-{slugify(place_name)}"


def record_candidate(
  *,
  source_post_id: str,
  mention: PlaceMention,
  status: str,
  resolved_place_id: str | None = None,
) -> PlaceCandidate:
  """Upsert a PlaceCandidate for an unresolved or low-confidence mention."""
  candidate = PlaceCandidate(
    candidate_id=make_candidate_id(source_post_id, mention.place_name),
    source_post_id=source_post_id,
    place_name=mention.place_name,
    status=status,
    hints=mention,
    last_tried_at=_now_iso(),
    resolved_place_id=resolved_place_id,
  )
  place_candidates_repo.save_candidate(candidate)
  return candidate


def mark_candidate_resolved(
  *,
  source_post_id: str,
  place_name: str,
  resolved_place_id: str,
) -> PlaceCandidate | None:
  """If a prior candidate exists for this mention, mark it resolved."""
  candidate_id = make_candidate_id(source_post_id, place_name)
  existing = place_candidates_repo.load_candidate(candidate_id)
  if existing is None:
    return None
  updated = replace(
    existing,
    status="resolved",
    resolved_place_id=resolved_place_id,
    last_tried_at=_now_iso(),
  )
  place_candidates_repo.save_candidate(updated)
  return updated


def _locate_debug(mention: PlaceMention):
  from travelplanner.places.locate import locate_mention_debug

  return locate_mention_debug(mention)


def _link_place_to_post(post: SavedPost, place_id: str) -> SavedPost:
  if place_id in post.place_ids:
    return post
  updated = replace(post, place_ids=(*post.place_ids, place_id))
  save_post(updated)
  return updated


@dataclass(frozen=True)
class RetryResult:
  attempted: int
  resolved: int
  still_open: int
  place_ids: tuple[str, ...]


def retry_place_candidates(
  *,
  source_post_id: str | None = None,
  include_low_confidence: bool = False,
) -> RetryResult:
  """Re-run locate on stored candidates without re-fetching the source post."""
  statuses: tuple[str, ...] = (
    ("unresolved", "low_confidence") if include_low_confidence else ("unresolved",)
  )
  open_candidates = place_candidates_repo.load_open_candidates(
    statuses=statuses,
    source_post_id=source_post_id,
  )

  resolved_place_ids: list[str] = []
  still_open = 0

  for candidate in open_candidates:
    try:
      debug = _locate_debug(candidate.hints)
    except Exception:
      still_open += 1
      place_candidates_repo.save_candidate(
        replace(candidate, last_tried_at=_now_iso()),
      )
      continue

    if debug.location is None or debug.status == "unresolved":
      still_open += 1
      place_candidates_repo.save_candidate(
        replace(
          candidate,
          status="unresolved",
          last_tried_at=_now_iso(),
          resolved_place_id=None,
        ),
      )
      continue

    place_id = upsert_place(
      candidate.hints,
      debug.location,
      candidate.source_post_id,
    )
    resolved_place_ids.append(place_id)

    new_status = "low_confidence" if debug.status == "low_confidence" else "resolved"
    place_candidates_repo.save_candidate(
      replace(
        candidate,
        status=new_status,
        last_tried_at=_now_iso(),
        resolved_place_id=place_id,
      ),
    )

    post = load_post_by_id(candidate.source_post_id)
    if post is not None:
      _link_place_to_post(post, place_id)

  return RetryResult(
    attempted=len(open_candidates),
    resolved=len(resolved_place_ids),
    still_open=still_open,
    place_ids=tuple(dict.fromkeys(resolved_place_ids)),
  )
