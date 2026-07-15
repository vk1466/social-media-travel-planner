from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.models import Platform, SavedPost
from travelplanner.places.candidates import mark_candidate_resolved, record_candidate
from travelplanner.places.locate import locate_mention_debug
from travelplanner.places.mentions import mentions_from_post
from travelplanner.places.resolve import upsert_place_record
from travelplanner.places.store import delete_all_places, load_all_places
from travelplanner.store import load_all_posts, save_post

logger = logging.getLogger(__name__)


def process_post_places(post: SavedPost) -> tuple[str, ...]:
  """Normalize -> locate -> resolve/upsert. Never raises.

  Unresolved mentions become PlaceCandidates. Low-confidence hits are upserted
  as Places and also recorded as candidates for review.
  """
  source_post_id = post.post_id
  place_ids: list[str] = []
  library = load_all_places()
  mentions = mentions_from_post(post)
  anchor_cache: dict[str, tuple[float, float] | None] = {}
  logger.info(
    "places process start post_id=%s mentions=%d",
    source_post_id,
    len(mentions),
  )

  for mention in mentions:
    try:
      debug = locate_mention_debug(mention, anchor_cache=anchor_cache)
    except Exception:
      logger.exception(
        "locate failed place_name=%r post_id=%s",
        mention.place_name,
        source_post_id,
      )
      record_candidate(
        source_post_id=source_post_id,
        mention=mention,
        status="unresolved",
      )
      continue

    if debug.location is None or debug.status == "unresolved":
      logger.info(
        "place unresolved place_name=%r post_id=%s notes=%s",
        mention.place_name,
        source_post_id,
        "; ".join(debug.notes[-3:]) if debug.notes else "",
      )
      record_candidate(
        source_post_id=source_post_id,
        mention=mention,
        status="unresolved",
      )
      continue

    saved = upsert_place_record(
      mention,
      debug.location,
      source_post_id,
      library=library,
    )
    place_id = saved.place_id
    library = [place for place in library if place.place_id != place_id]
    library.append(saved)

    if debug.status == "low_confidence":
      logger.info(
        "place low_confidence place_name=%r place_id=%s confidence=%.2f post_id=%s",
        mention.place_name,
        place_id,
        debug.match_confidence or 0.0,
        source_post_id,
      )
      record_candidate(
        source_post_id=source_post_id,
        mention=mention,
        status="low_confidence",
        resolved_place_id=place_id,
      )
    else:
      logger.info(
        "place resolved place_name=%r place_id=%s confidence=%.2f post_id=%s",
        mention.place_name,
        place_id,
        debug.match_confidence or 0.0,
        source_post_id,
      )
      mark_candidate_resolved(
        source_post_id=source_post_id,
        place_name=mention.place_name,
        resolved_place_id=place_id,
      )

    if place_id not in place_ids:
      place_ids.append(place_id)

  logger.info(
    "places process done post_id=%s place_ids=%d",
    source_post_id,
    len(place_ids),
  )
  return tuple(place_ids)


def reprocess_all_places(platform: Platform | None = None) -> None:
  """Rebuild place library using the locate/resolve path."""
  logger.info("places reprocess start platform=%s", platform)
  if platform is None:
    delete_all_places()

  for post in load_all_posts(platform=platform):
    place_ids = process_post_places(post)
    if place_ids != post.place_ids:
      save_post(replace(post, place_ids=place_ids))

  try:
    from travelplanner.hierarchy import link_places

    link_places()
  except Exception:
    logger.exception("hierarchy link_places failed after reprocess")
  logger.info("places reprocess done platform=%s", platform)
