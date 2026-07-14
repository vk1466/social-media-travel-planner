from __future__ import annotations

from dataclasses import replace

from travelplanner.models import Platform, SavedPost
from travelplanner.places.candidates import mark_candidate_resolved, record_candidate
from travelplanner.places.locate import locate_mention_debug
from travelplanner.places.mentions import mentions_from_post
from travelplanner.places.resolve import upsert_place
from travelplanner.places.store import delete_all_places, load_all_places, load_place
from travelplanner.store import load_all_posts, save_post


def process_post_places(post: SavedPost) -> tuple[str, ...]:
  """Normalize -> locate -> resolve/upsert. Never raises.

  Unresolved mentions become PlaceCandidates. Low-confidence hits are upserted
  as Places and also recorded as candidates for review.
  """
  source_post_id = post.post_id
  place_ids: list[str] = []
  library = load_all_places()

  for mention in mentions_from_post(post):
    try:
      debug = locate_mention_debug(mention)
    except Exception:
      record_candidate(
        source_post_id=source_post_id,
        mention=mention,
        status="unresolved",
      )
      continue

    if debug.location is None or debug.status == "unresolved":
      record_candidate(
        source_post_id=source_post_id,
        mention=mention,
        status="unresolved",
      )
      continue

    place_id = upsert_place(
      mention,
      debug.location,
      source_post_id,
      library=library,
    )
    saved = load_place(place_id)
    if saved is not None:
      library = [place for place in library if place.place_id != place_id]
      library.append(saved)

    if debug.status == "low_confidence":
      record_candidate(
        source_post_id=source_post_id,
        mention=mention,
        status="low_confidence",
        resolved_place_id=place_id,
      )
    else:
      mark_candidate_resolved(
        source_post_id=source_post_id,
        place_name=mention.place_name,
        resolved_place_id=place_id,
      )

    if place_id not in place_ids:
      place_ids.append(place_id)

  return tuple(place_ids)


def reprocess_all_places(platform: Platform | None = None) -> None:
  """Rebuild place library using the locate/resolve path."""
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
    pass
